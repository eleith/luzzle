import { mkdir, writeFile } from 'fs/promises'
import { getFrontmatterValues } from '@luzzle/core'
import {
	getAssetDir,
	getAssetPath,
	getImageAssetPath,
	ASSET_SIZES,
	type WebPiecesAsset,
} from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import mime from 'mime-types'
import { generateVariantJobs } from './variants.js'
import type { TransformInput } from './types.js'

function getMimeType(format: string): string {
	const type = format === 'jpg' ? 'jpeg' : format
	return `image/${type}`
}

async function upsertAssetRecord(
	db: TransformInput['db'],
	record: WebPiecesAsset
) {
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

export async function run({ item, config, outDir, pieces, db }: TransformInput): Promise<void> {
	const pieceConfig = config.pieces.find((p) => p.type === item.type)
	if (!pieceConfig) return

	const mediaFields = pieceConfig.fields.media || []
	if (mediaFields.length === 0) return

	const webDb = db.withTables<{ web_pieces_assets: WebPiecesAsset }>()
	const frontmatter = JSON.parse(item.frontmatter_json)
	const key = generateAssetKey(item.file_path, config.assets.salt)
	const assetDir = getAssetDir(item.type, key)

	await webDb
		.deleteFrom('web_pieces_assets')
		.where('piece_file_path', '=', item.file_path)
		.where('transformation', 'like', 'image.%')
		.execute()

	const sizeCategoryMap = Object.entries(ASSET_SIZES).reduce(
		(acc, [category, width]) => {
			acc[width] = category
			return acc
		},
		{} as Record<number, string>
	)

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
					`[Media] Skipping non-image file "${asset}" in media field "${field}" for ${item.file_path}`
				)
				continue
			}

			if (!hasAssets) {
				await mkdir(`${outDir}/${assetDir}`, { recursive: true })
				console.log(`copying assets for ${item.file_path}`)
				hasAssets = true
			}

			try {
				const assetPath = getAssetPath(item.type, key, asset)
				const assetBuffer = await pieces.getPieceAsset(asset)
				await writeFile(`${outDir}/${assetPath}`, assetBuffer)

				await upsertAssetRecord(db, {
					piece_file_path: item.file_path,
					piece_key: key,
					piece_asset_path: asset,
					piece_field_path: field,
					transformation: 'image.original',
					asset_path: assetPath,
					mime_type: mimeType,
				})

				const jobs = await generateVariantJobs(
					item,
					asset,
					pieces,
					Object.values(ASSET_SIZES),
					['avif', 'jpg']
				)

				const toFileJobs = jobs.map(async (job) => {
					const variantPath = getImageAssetPath(item.type, key, asset, job.width, job.format)
					await job.sharp.toFile(`${outDir}/${variantPath}`)
					const sizeCategory = sizeCategoryMap[job.width]

					await upsertAssetRecord(db, {
						piece_file_path: item.file_path,
						piece_key: key,
						piece_asset_path: asset,
						piece_field_path: field,
						transformation: `image.${sizeCategory}.${job.format}`,
						asset_path: variantPath,
						mime_type: getMimeType(job.format),
					})
				})

				await Promise.all(toFileJobs)
			} catch (error) {
				console.error(`error processing media ${asset} for ${item.file_path}: ${error}`)
			}
		}
	}
}
