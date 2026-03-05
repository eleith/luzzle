import { mkdir, writeFile } from 'fs/promises'
import { getFrontmatterValues } from '@luzzle/core'
import { getAssetPath, getAssetDir } from '@luzzle/web.utils'
import mime from 'mime-types'
import type { TransformInput, AssetRecord } from './types.js'

export async function run({
	webPiece,
	config,
	outDir,
	pieces,
	assetKeyToPath,
}: TransformInput): Promise<AssetRecord[]> {
	const pieceConfig = config.pieces.find((p) => p.type === webPiece.type)
	if (!pieceConfig?.fields.attachments) return []

	const frontmatter = JSON.parse(webPiece.json_metadata)
	const attachments = pieceConfig.fields.attachments
	const records: AssetRecord[] = []

	for (const field of attachments) {
		const assets = getFrontmatterValues<string>(frontmatter, field)
			.flat()
			.map((key) => assetKeyToPath.get(key))
			.filter((s) => typeof s === 'string')

		for (const asset of assets) {
			const assetPath = getAssetPath(webPiece.type, webPiece.key, asset)
			const assetDir = getAssetDir(webPiece.type, webPiece.key)
			await mkdir(`${outDir}/${assetDir}`, { recursive: true })
			const assetBuffer = await pieces.getPieceAsset(asset)
			await writeFile(`${outDir}/${assetPath}`, assetBuffer)
			const mimeType = mime.lookup(asset) || 'application/octet-stream'
			records.push({
				piece_asset_path: asset,
				transformation: 'attachment',
				asset_path: assetPath,
				mime_type: mimeType,
			})
		}
	}

	return records
}
