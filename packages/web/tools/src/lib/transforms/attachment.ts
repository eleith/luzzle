import { mkdir, writeFile } from 'fs/promises'
import { getFrontmatterValues } from '@luzzle/core'
import { getAssetPath, getAssetDir } from '@luzzle/web.utils'
import mime from 'mime-types'
import type { TransformInput, AssetRecord } from './types.js'

export async function run({ webPiece, config, outDir, pieces }: TransformInput): Promise<AssetRecord[]> {
	const pieceConfig = config.pieces.find((p) => p.type === webPiece.type)
	if (!pieceConfig?.fields.attachments) return []

	const frontmatter = JSON.parse(webPiece.json_metadata)
	const records: AssetRecord[] = []

	for (const field of pieceConfig.fields.attachments) {
		const assets = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)
		for (const asset of assets) {
			try {
				const assetPath = getAssetPath(webPiece.type, webPiece.key, asset)
				const assetDir = getAssetDir(webPiece.type, webPiece.key)
				await mkdir(`${outDir}/${assetDir}`, { recursive: true })
				const assetBuffer = await pieces.getPieceAsset(asset)
				await writeFile(`${outDir}/${assetPath}`, assetBuffer)
				const mimeType = mime.lookup(asset) || 'application/octet-stream'
				records.push({
					piece_asset_path: asset,
					transformation: 'attachment.original',
					asset_path: assetPath,
					mime_type: mimeType,
				})
				console.log(`[attachment] ${asset} for ${webPiece.file_path}`)
			} catch (error) {
				console.error(`[error] attachment ${asset} for ${webPiece.file_path}: ${error}`)
			}
		}
	}

	return records
}
