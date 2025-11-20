import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { Pieces, StorageFileSystem } from '@luzzle/cli'
import { generateVariantJobs } from './variants.js'
import { getDatabaseClient, LuzzleSelectable } from '@luzzle/core'
import { loadConfig } from '@luzzle/web.utils/server'
import {
	getAssetDir,
	getAssetPath,
	isImage,
	ASSET_SIZES,
	getImageAssetPath,
} from '@luzzle/web.utils'

async function generateVariantsForAssetField(
	item: LuzzleSelectable<'pieces_items'>,
	asset: string,
	pieces: Pieces,
	outDir: string
) {
	const formats: Array<'avif' | 'jpg'> = ['avif', 'jpg']

	try {
		const widths = Object.values(ASSET_SIZES)
		const jobs = await generateVariantJobs(item, asset, pieces, widths, formats)

		const toFileJobs = jobs.map((job) => {
			const assetPath = getImageAssetPath(item.type, item.id, asset, job.width, job.format)
			return job.sharp.toFile(`${outDir}/${assetPath}`)
		})
		await Promise.all(toFileJobs)
	} catch (error) {
		console.error(`error generating variants for ${asset}: ${error}`)
	}
}

export default async function generateAssets(
	configPath: string,
	luzzle: string,
	outDir: string,
	options: { force?: boolean; id?: string }
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
	const id = options.id || null
	const operation = 'copy-assets'
	const lastRun = force ? new Date(0) : await getLastRunFor(outDir, operation)

	const storage = new StorageFileSystem(luzzle)
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
				const assetDir = getAssetDir(item.type, item.id)
				await mkdir(`${outDir}/${assetDir}`, { recursive: true })

				console.log(`copying assets for ${item.file_path}`)

				for (const asset of assets) {
					try {
						const assetPath = getAssetPath(item.type, item.id, asset)
						const assetBuffer = await pieces.getPieceAsset(asset)

						await writeFile(`${outDir}/${assetPath}`, assetBuffer)

						if (isImage(asset)) {
							await generateVariantsForAssetField(item, asset, pieces, outDir)
						}
					} catch (error) {
						console.error(`error processing asset ${asset} for ${item.file_path}: ${error}`)
					}
				}
			}
		}
	}

	if (!id) {
		await setLastRunFor(outDir, operation, new Date())
	}
}
