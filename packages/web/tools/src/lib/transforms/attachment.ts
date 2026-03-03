import { mkdir, writeFile } from 'fs/promises'
import { getFrontmatterValues } from '@luzzle/core'
import { getAssetPath, getAssetDir, type WebPiecesAsset } from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import mime from 'mime-types'
import type { TransformInput } from './types.js'

export async function run({ item, config, outDir, pieces, db }: TransformInput): Promise<void> {
	const pieceConfig = config.pieces.find((p) => p.type === item.type)
	if (!pieceConfig?.fields.attachments) return

	const webDb = db.withTables<{ web_pieces_assets: WebPiecesAsset }>()
	const frontmatter = JSON.parse(item.frontmatter_json)
	const key = generateAssetKey(item.file_path, config.assets.salt)

	await webDb
		.deleteFrom('web_pieces_assets')
		.where('piece_file_path', '=', item.file_path)
		.where('transformation', 'like', 'attachment.%')
		.execute()

	for (const field of pieceConfig.fields.attachments) {
		const assets = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)
		for (const asset of assets) {
			try {
				const assetPath = getAssetPath(item.type, key, asset)
				const assetDir = getAssetDir(item.type, key)
				await mkdir(`${outDir}/${assetDir}`, { recursive: true })
				const assetBuffer = await pieces.getPieceAsset(asset)
				await writeFile(`${outDir}/${assetPath}`, assetBuffer)
				const mimeType = mime.lookup(asset) || 'application/octet-stream'
				await webDb
					.insertInto('web_pieces_assets')
					.values({
						piece_file_path: item.file_path,
						piece_key: key,
						piece_asset_path: asset,
						transformation: 'attachment.original',
						asset_path: assetPath,
						mime_type: mimeType,
					})
					.execute()
				console.log(`[attachment] ${asset} for ${item.file_path}`)
			} catch (error) {
				console.error(`[error] attachment ${asset} for ${item.file_path}: ${error}`)
			}
		}
	}
}
