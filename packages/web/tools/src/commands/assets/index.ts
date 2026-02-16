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
} from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { getStorage } from '../../lib/storage.js'
import { getDatabase } from '../../lib/database.js'
import { type Config } from '@luzzle/web.utils'

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
