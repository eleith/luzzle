import { mkdir, writeFile } from 'fs/promises'
import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { generateVariantJobs } from './variants.js'
import { Pieces, LuzzleSelectable } from '@luzzle/core'
import {
	getAssetDir,
	getAssetPath,
	isImage,
	ASSET_SIZES,
	getImageAssetPath,
	type WebPiecesAsset,
} from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { getStorage } from '../../lib/storage.js'
import { getDatabase } from '../../lib/database.js'
import { type Config } from '@luzzle/web.utils'
import mime from 'mime-types'

const MAX_TEXT_CONTENT_SIZE = 50000

function isTextBased(mimeType: string | false): boolean {
	if (!mimeType) return false
	return (
		mimeType.startsWith('text/') ||
		mimeType === 'application/json' ||
		mimeType === 'application/xml' ||
		mimeType === 'application/javascript'
	)
}

async function upsertAssetRecord(
	db: ReturnType<typeof getDatabase>,
	record: WebPiecesAsset
) {
	await db
		.withTables<{ web_pieces_assets: WebPiecesAsset }>()
		.insertInto('web_pieces_assets')
		.values(record)
		.onConflict((oc) =>
			oc.columns(['piece_file_path', 'asset_name', 'transformation']).doUpdateSet({
				asset_path: record.asset_path,
				size: record.size,
				mime_type: record.mime_type,
				is_embedded: record.is_embedded,
				cached_content: record.cached_content,
			})
		)
		.execute()
}

async function generateVariantsForAssetField(
	item: LuzzleSelectable<'pieces_items'>,
	asset: string,
	pieces: Pieces,
	outDir: string,
	config: Config
) {
	const formats: Array<'avif' | 'jpg'> = ['avif', 'jpg']

	try {
		const widths = Object.values(ASSET_SIZES)
		const jobs = await generateVariantJobs(item, asset, pieces, widths, formats)
		const key = generateAssetKey(item.file_path, config.assets.salt)

		const toFileJobs = jobs.map((job) => {
			const assetPath = getImageAssetPath(item.type, key, asset, job.width, job.format)
			return job.sharp.toFile(`${outDir}/${assetPath}`)
		})
		await Promise.all(toFileJobs)
	} catch (error) {
		console.error(`error generating variants for ${asset}: ${error}`)
	}
}

type GenerateAssetsOptions = {
	archiveDir?: string
	outDir: string
	force?: boolean
	id?: string
}

export default async function generateAssets(options: GenerateAssetsOptions, config: Config) {
	const db = getDatabase(config)
	const pieceTypes = config.pieces.map((p) => p.type)
	const items = await db
		.selectFrom('pieces_items')
		.selectAll()
		.orderBy('date_updated', 'desc')
		.orderBy('type', 'asc')
		.where('type', 'in', pieceTypes)
		.execute()

	const force = options.force || false
	const id = options.id || null
	const operation = 'copy-assets'
	const lastRun = force ? new Date(0) : await getLastRunFor(options.outDir, operation)

	const storage = getStorage(config, options.archiveDir)
	const pieces = new Pieces(storage)
	const itemsToProcess = id ? items.filter((item) => item.id === id) : items

	const pieceFields = config.pieces.reduce(
		(acc, piece) => {
			const mediaField = piece.fields.media
			const assetFields = piece.fields.assets || []
			const type = piece.type
			acc[type] = [mediaField, ...assetFields].filter(Boolean) as string[]

			return acc
		},
		{} as Record<string, string[]>
	)

	for (const item of itemsToProcess) {
		const pieceModifiedTime = new Date(item.date_updated || item.date_added)
		const fields = pieceFields[item.type] || []

		if (fields.length && (pieceModifiedTime > lastRun || force || id)) {
			const frontmatter = JSON.parse(item.frontmatter_json)
			const assets = fields.flatMap((field) => frontmatter[field]).filter(Boolean) as string[]

			if (assets.length) {
				const key = generateAssetKey(item.file_path, config.assets.salt)
				const assetDir = getAssetDir(item.type, key)
				await mkdir(`${options.outDir}/${assetDir}`, { recursive: true })

				console.log(`copying assets for ${item.file_path}`)

				for (const asset of assets) {
					try {
						const assetPath = getAssetPath(item.type, key, asset)
						const assetBuffer = await pieces.getPieceAsset(asset)

						await writeFile(`${options.outDir}/${assetPath}`, assetBuffer)

						const size = assetBuffer.length
						const mimeType = mime.lookup(asset) || 'application/octet-stream'
						const isText = isTextBased(mimeType)
						const isEmbedded = isText && size < MAX_TEXT_CONTENT_SIZE

						await upsertAssetRecord(db, {
							piece_file_path: item.file_path,
							piece_key: key,
							asset_name: asset,
							transformation: 'original',
							asset_path: assetPath,
							size,
							mime_type: mimeType,
							is_embedded: isEmbedded,
							cached_content: isEmbedded ? assetBuffer.toString('utf-8') : null,
						})

						if (isImage(asset)) {
							await generateVariantsForAssetField(item, asset, pieces, options.outDir, config)
						}
					} catch (error) {
						console.error(`error processing asset ${asset} for ${item.file_path}: ${error}`)
					}
				}
			}
		}
	}

	if (!id) {
		await setLastRunFor(options.outDir, operation, new Date())
	}
}
