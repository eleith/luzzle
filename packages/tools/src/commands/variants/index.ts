import { mkdir } from 'fs/promises'
import path from 'path'
import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { Pieces, StorageFileSystem } from '@luzzle/cli'
import { generateVariantJobs } from './variants.js'
import { getDatabaseClient, LuzzleSelectable } from '@luzzle/core'
import { loadConfig } from '../../lib/config/config.js'
import { getVariantPath } from './utils.js'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']
const SIZES = [125, 250, 500, 1000]

function isImageAsset(filename: string) {
	return IMAGE_EXTENSIONS.indexOf(path.extname(filename).toLowerCase()) !== -1
}

async function generateVariantsForAssetField(
	item: LuzzleSelectable<'pieces_items'>,
	asset: string,
	pieces: Pieces,
	outDir: string
) {
	const formats: Array<'avif' | 'jpg'> = ['avif', 'jpg']

	try {
		const jobs = await generateVariantJobs(item, asset, pieces, SIZES, formats)
		const assetPath = getVariantPath(item.type, item.id, asset)
		const assetDir = path.dirname(assetPath)

		await mkdir(`${outDir}/${assetDir}`, { recursive: true })

		const toFileJobs = jobs.map((job) => {
			const assetPath = getVariantPath(item.type, item.id, asset, job.format, job.size)
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
	const items = await db
		.selectFrom('pieces_items')
		.selectAll()
		.orderBy('date_updated', 'desc')
		.orderBy('type', 'asc')
		.execute()

	const force = options.force || false
	const limit = options.limit || Infinity
	const operation = 'generate-variants'
	const lastRun = force ? new Date(0) : await getLastRunFor(outDir, operation)
	const storage = new StorageFileSystem(luzzle)
	const pieces = new Pieces(storage)
	const itemsToProcess = limit === Infinity ? items : items.slice(0, limit)

	for (const item of itemsToProcess) {
		const pieceModifiedTime = new Date(item.date_updated || item.date_added)

		if (pieceModifiedTime > lastRun || force) {
			const assets = item.assets_json_array ? (JSON.parse(item.assets_json_array) as string[]) : []
			const imageAssets = assets.filter(Boolean).filter(isImageAsset)

			if (imageAssets.length) {
				console.log(`generating variants for ${item.file_path}`)

				for (const asset of imageAssets) {
					await generateVariantsForAssetField(item, asset, pieces, outDir)
				}
			}
		}
	}

	if (!force && (limit === Infinity || !limit)) {
		await setLastRunFor(outDir, operation, new Date())
	}
}
