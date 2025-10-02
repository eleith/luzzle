import { copyFile, mkdir } from 'fs/promises'
import path from 'path'
import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { Pieces, StorageFileSystem } from '@luzzle/cli'
import { generateVariantJobs } from './variants.js'
import { getDatabaseClient, LuzzleSelectable } from '@luzzle/core'
import { loadConfig } from '../../lib/config/config.js'
import { getAssetDir, getAssetPath, isImage } from './utils.js'

const SIZES = [125, 250, 500, 1000]

async function generateVariantsForAssetField(
	item: LuzzleSelectable<'pieces_items'>,
	asset: string,
	pieces: Pieces,
	outDir: string
) {
	const formats: Array<'avif' | 'jpg'> = ['avif', 'jpg']

	try {
		const jobs = await generateVariantJobs(item, asset, pieces, SIZES, formats)

		const toFileJobs = jobs.map((job) => {
			const assetPath = getAssetPath(item.type, item.id, asset, {
				format: job.format,
				width: job.size,
			})
			return job.sharp.toFile(`${outDir}/${assetPath}`)
		})
		await Promise.all(toFileJobs)
	} catch (error) {
		console.error(`error generating variants for ${asset}: ${error}`)
	}
}

export default async function generateVariants(
	configPath: string,
	luzzle: string,
	outDir: string,
	options: { force?: boolean; limit?: number }
) {
	const config = loadConfig(configPath)
	const dbPath = path.join(path.dirname(configPath), config.paths.database)
	const db = getDatabaseClient(dbPath)
	const pieceTypes = config.pieces.map((p) => p.type)
	const items = await db
		.selectFrom('pieces_items')
		.selectAll()
		.orderBy('date_updated', 'desc')
		.orderBy('type', 'asc')
		.where('type', 'in', pieceTypes)
		.execute()

	const force = options.force || false
	const limit = options.limit || Infinity
	const operation = 'copy-assets'
	const lastRun = force ? new Date(0) : await getLastRunFor(outDir, operation)
	const storage = new StorageFileSystem(luzzle)
	const pieces = new Pieces(storage)
	const itemsToProcess = limit === Infinity ? items : items.slice(0, limit)

	const pieceFields = config.pieces.reduce((acc, piece) => {
		const mediaField = piece.fields.media
		const assetFields = piece.fields.assets || []
		const type = piece.type
		acc[type] = [mediaField, ...assetFields].filter(Boolean) as string[]

	 	return acc
	}, {} as Record<string, string[]>)

	for (const item of itemsToProcess) {
		const pieceModifiedTime = new Date(item.date_updated || item.date_added)
		const fields = pieceFields[item.type] || []

		if (fields.length && (pieceModifiedTime > lastRun || force)) {
			const frontmatter = JSON.parse(item.frontmatter_json)
			const assets = fields.flatMap((field) => frontmatter[field]).filter(Boolean) as string[]
			const imageAssets = assets.filter(isImage)
			const assetDir = getAssetDir(item.type, item.id)

			await mkdir(`${outDir}/${assetDir}`, { recursive: true })

			if (assets.length) {
				console.log(`copying assets for ${item.file_path}`)

				for (const asset of assets) {
					const assetPath = getAssetPath(item.type, item.id, asset)
					await copyFile(asset, `${outDir}/${assetPath}`)
				}

				if (imageAssets.length) {
					for (const asset of imageAssets) {
						await generateVariantsForAssetField(item, asset, pieces, outDir)
					}
				}
			}
		}
	}

	if (!force && (limit === Infinity || !limit)) {
		await setLastRunFor(outDir, operation, new Date())
	}
}
