import { getFrontmatterValues } from '@luzzle/core'
import mime from 'mime-types'
import type { PreviewAssetRecord, PreviewContext, PreviewResolver } from './types.js'

async function resolve(context: PreviewContext): Promise<PreviewAssetRecord[]> {
	const { frontmatter, pieceConfig, pathToKey } = context
	const mediaFields = pieceConfig.fields.media
	if (!mediaFields) return []

	const records: PreviewAssetRecord[] = []

	for (const field of mediaFields) {
		const paths = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)

		for (const assetPath of paths) {
			const assetKey = pathToKey.get(assetPath)
			if (!assetKey) continue

			const mimeType = mime.lookup(assetPath) || 'application/octet-stream'
			if (!mimeType.startsWith('image/')) continue

			records.push({
				asset_key: assetKey,
				transformation: 'image.original',
				asset_path: assetPath,
				mime_type: mimeType,
				piece_asset_path: assetPath
			})
		}
	}

	return records
}

export const imageResolver: PreviewResolver = { name: 'image', resolve }
