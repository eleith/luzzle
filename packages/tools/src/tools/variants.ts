import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { getLastRunFor, setLastRunFor } from '../lib/lastRun.js'
import { Pieces, StorageFileSystem } from '@luzzle/cli'
import { generateVariantJobs } from './variants/variants.js'
import { getDatabaseClient } from '@luzzle/core'
import { loadConfig } from '../lib/config-loader.js'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']
const SIZES = {
	small: 125,
	medium: 250,
	large: 500,
	xl: 1000,
}

function isImageAsset(filename: string) {
	return IMAGE_EXTENSIONS.indexOf(path.extname(filename).toLowerCase()) !== -1
}

async function generateVariantsForAssetField(
	asset: string,
	pieces: Pieces,
	variantDir: string
) {
	const baseName = path.basename(asset, path.extname(asset))
	const sizes = [SIZES.small, SIZES.medium, SIZES.large, SIZES.xl]
	const sizeKeys = Object.keys(SIZES)
	const formats: Array<'avif' | 'jpg'> = ['avif', 'jpg']

	try {
		const jobs = await generateVariantJobs(asset, pieces, sizes, formats)
		const toFileJobs = jobs.map((job) => {
			const sizeName = sizeKeys[sizes.indexOf(job.size)]
			return job.sharp.toFile(`${variantDir}/${baseName}.${sizeName}.${job.format}`)
		})
		await Promise.all(toFileJobs)
	} catch (error) {
		console.error(`error generating variants for ${asset}: ${error}`)
	}
}

export async function generateVariants(
	configPath: string,
	luzzle: string,
	outDir: string,
	options: { force?: boolean; limit?: number }
) {
	const config = loadConfig({ userConfigPath: configPath })
	const db = getDatabaseClient(config.paths.database)
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
			const fields = item.assets_json_array ? JSON.parse(item.assets_json_array) as string[] : []
			const imageFields = fields.filter(isImageAsset)
			const variantDir = `${outDir}/${item.type}/${item.id}`

			console.log(`generating variants for ${item.file_path}`)
			await mkdir(variantDir, { recursive: true })

			for (const field of imageFields) {
				const fieldAsset = await pieces.getPieceAsset(field)
				await writeFile(`${variantDir}/${path.basename(field)}`, fieldAsset)
				await generateVariantsForAssetField(field, pieces, variantDir)
			}
		}
	}

	if (!force && (limit === Infinity || !limit)) {
		await setLastRunFor(outDir, operation, new Date())
	}
}
