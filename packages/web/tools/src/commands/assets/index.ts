import { mkdir, writeFile } from 'fs/promises'
import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { generateVariantJobs } from './variants.js'
import { Pieces, LuzzleSelectable, getFrontmatterValues } from '@luzzle/core'
import {
	getAssetDir,
	getAssetPath,
	ASSET_SIZES,
	getImageAssetPath,
	type WebPiecesAsset,
} from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { getStorage } from '../../lib/storage.js'
import { getDatabase } from '../../lib/database.js'
import { type Config } from '@luzzle/web.utils'
import mime from 'mime-types'

function getMimeType(format: string): string {
	const type = format === 'jpg' ? 'jpeg' : format
	return `image/${type}`
}

async function upsertAssetRecord(db: ReturnType<typeof getDatabase>, record: WebPiecesAsset) {
	await db
		.withTables<{ web_pieces_assets: WebPiecesAsset }>()
		.insertInto('web_pieces_assets')
		.values(record)
		.onConflict((oc) =>
			oc.columns(['piece_file_path', 'transformation', 'piece_asset_path']).doUpdateSet({
				asset_path: record.asset_path,
				mime_type: record.mime_type,
				piece_field_path: record.piece_field_path,
				is_embedded: record.is_embedded,
				content: record.content,
			})
		)
		.execute()
}

async function generateVariantsForAssetField(
	item: LuzzleSelectable<'pieces_items'>,
	asset: string,
	field: string,
	pieces: Pieces,
	outDir: string,
	config: Config,
	db: ReturnType<typeof getDatabase>
) {
	const formats: Array<'avif' | 'jpg'> = ['avif', 'jpg']

	try {
		const widths = Object.values(ASSET_SIZES)
		const jobs = await generateVariantJobs(item, asset, pieces, widths, formats)
		const key = generateAssetKey(item.file_path, config.assets.salt)

		const sizeCategoryMap = Object.entries(ASSET_SIZES).reduce(
			(acc, [category, width]) => {
				acc[width] = category
				return acc
			},
			{} as Record<number, string>
		)

		const toFileJobs = jobs.map(async (job) => {
			const assetPath = getImageAssetPath(item.type, key, asset, job.width, job.format)
			await job.sharp.toFile(`${outDir}/${assetPath}`)
			const sizeCategory = sizeCategoryMap[job.width]

			await upsertAssetRecord(db, {
				piece_file_path: item.file_path,
				piece_key: key,
				piece_asset_path: asset,
				piece_field_path: field,
				transformation: `image.${sizeCategory}.${job.format}`,
				asset_path: assetPath,
				mime_type: getMimeType(job.format),
			})
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
	const mediaFields = config.pieces.flatMap((piece) => piece.fields.media || [])
	const attachmentFields = config.pieces.flatMap((piece) => piece.fields.attachments || [])

	for (const item of itemsToProcess) {
		const pieceModifiedTime = new Date(item.date_updated || item.date_added)
		const configHasPieceType = config.pieces.some((p) => p.type === item.type)

		if (configHasPieceType && (pieceModifiedTime > lastRun || force || id)) {
			const frontmatter = JSON.parse(item.frontmatter_json)
			const key = generateAssetKey(item.file_path, config.assets.salt)
			const assetDir = getAssetDir(item.type, key)

			let hasAssets = false

			for (const field of mediaFields) {
				const assets = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)
				if (assets.length === 0) {
					console.warn(`[Media] No assets found at path "${field}" for ${item.file_path}`)
					continue
				}

				for (const asset of assets) {
					const mimeType = mime.lookup(asset) || 'application/octet-stream'
					if (!mimeType.startsWith('image/')) {
						console.warn(
							`[Media] Skipping non-image file "${asset}" in media field for ${item.file_path}`
						)
						continue
					}

					if (!hasAssets) {
						await mkdir(`${options.outDir}/${assetDir}`, { recursive: true })
						console.log(`copying assets for ${item.file_path}`)
						hasAssets = true
					}

					try {
						const assetPath = getAssetPath(item.type, key, asset)
						const assetBuffer = await pieces.getPieceAsset(asset)
						await writeFile(`${options.outDir}/${assetPath}`, assetBuffer)

						await upsertAssetRecord(db, {
							piece_file_path: item.file_path,
							piece_key: key,
							piece_asset_path: asset,
							piece_field_path: field,
							transformation: 'original',
							asset_path: assetPath,
							mime_type: mimeType,
						})

						await generateVariantsForAssetField(
							item,
							asset,
							field,
							pieces,
							options.outDir,
							config,
							db
						)
					} catch (error) {
						console.error(`error processing media ${asset} for ${item.file_path}: ${error}`)
					}
				}
			}

			for (const field of attachmentFields) {
				const assets = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)
				if (assets.length === 0) {
					console.warn(`[Attachment] No assets found at path "${field}" for ${item.file_path}`)
					continue
				}

				for (const asset of assets) {
					if (!hasAssets) {
						await mkdir(`${options.outDir}/${assetDir}`, { recursive: true })
						console.log(`copying assets for ${item.file_path}`)
						hasAssets = true
					}

					try {
						const assetPath = getAssetPath(item.type, key, asset)
						const assetBuffer = await pieces.getPieceAsset(asset)
						await writeFile(`${options.outDir}/${assetPath}`, assetBuffer)

						const mimeType = mime.lookup(asset) || 'application/octet-stream'

						await upsertAssetRecord(db, {
							piece_file_path: item.file_path,
							piece_key: key,
							piece_asset_path: asset,
							transformation: 'original',
							asset_path: assetPath,
							mime_type: mimeType,
						})
					} catch (error) {
						console.error(`error processing attachment ${asset} for ${item.file_path}: ${error}`)
					}
				}
			}
		}
	}

	if (!id) {
		await setLastRunFor(options.outDir, operation, new Date())
	}
}
