import { mkdir, writeFile } from 'fs/promises'
import { getFrontmatterValues } from '@luzzle/core'
import {
	getAssetDir,
	getAssetPath,
	getImageAssetPath,
	ASSET_SIZES,
} from '@luzzle/web.utils'
import mime from 'mime-types'
import { generateVariantJobs } from './variants.js'
import type { TransformInput, AssetRecord } from './types.js'

function getMimeType(format: string): string {
	const type = format === 'jpg' ? 'jpeg' : format
	return `image/${type}`
}

export async function run({ webPiece, config, outDir, pieces, assetKeyToPath }: TransformInput): Promise<AssetRecord[]> {
	const pieceConfig = config.pieces.find((p) => p.type === webPiece.type)
	if (!pieceConfig) return []

	const mediaFields = pieceConfig.fields.media || []
	if (mediaFields.length === 0) return []

	const frontmatter = JSON.parse(webPiece.json_metadata)
	const assetDir = getAssetDir(webPiece.type, webPiece.key)
	const records: AssetRecord[] = []

	const sizeCategoryMap = Object.entries(ASSET_SIZES).reduce(
		(acc, [category, width]) => {
			acc[width] = category
			return acc
		},
		{} as Record<number, string>
	)

	let hasAssets = false

	for (const field of mediaFields) {
		const assetKeys = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)

		for (const assetKey of assetKeys) {
			const asset = assetKeyToPath.get(assetKey) ?? assetKey
			const mimeType = mime.lookup(asset) || 'application/octet-stream'
			if (!mimeType.startsWith('image/')) {
				throw new Error(`non-image file "${asset}" in media field "${field}"`)
			}

			if (!hasAssets) {
				await mkdir(`${outDir}/${assetDir}`, { recursive: true })
				hasAssets = true
			}

			const assetPath = getAssetPath(webPiece.type, webPiece.key, asset)
			const assetBuffer = await pieces.getPieceAsset(asset)
			await writeFile(`${outDir}/${assetPath}`, assetBuffer)

			records.push({
				piece_asset_path: asset,
				piece_field_path: field,
				transformation: 'image.original',
				asset_path: assetPath,
				mime_type: mimeType,
			})

			const jobs = await generateVariantJobs(
				webPiece.file_path,
				asset,
				pieces,
				Object.values(ASSET_SIZES),
				['avif', 'jpg']
			)

			const toFileJobs = jobs.map(async (job) => {
				const variantPath = getImageAssetPath(webPiece.type, webPiece.key, asset, job.width, job.format)
				await job.sharp.toFile(`${outDir}/${variantPath}`)
				const sizeCategory = sizeCategoryMap[job.width]
				records.push({
					piece_asset_path: asset,
					piece_field_path: field,
					transformation: `image.${sizeCategory}.${job.format}`,
					asset_path: variantPath,
					mime_type: getMimeType(job.format),
				})
			})

			await Promise.all(toFileJobs)
		}
	}

	return records
}
