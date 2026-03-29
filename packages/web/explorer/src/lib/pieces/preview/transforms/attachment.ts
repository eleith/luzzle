import { getFrontmatterValues } from '@luzzle/core'
import mime from 'mime-types'
import type { PreviewAssetRecord, PreviewContext, PreviewResolver } from './types.js'

async function resolve(context: PreviewContext): Promise<PreviewAssetRecord[]> {
	const { frontmatter, pieceConfig, pathToKey } = context
	const attachmentFields = pieceConfig.fields.attachments
	if (!attachmentFields) return []

	const records: PreviewAssetRecord[] = []

	for (const field of attachmentFields) {
		const paths = getFrontmatterValues<string>(frontmatter, field).flat().filter(Boolean)

		for (const assetPath of paths) {
			const assetKey = pathToKey.get(assetPath)
			if (!assetKey) continue

			records.push({
				asset_key: assetKey,
				transformation: 'attachment',
				asset_path: assetPath,
				mime_type: mime.lookup(assetPath) || 'application/octet-stream',
				piece_asset_path: assetPath
			})
		}
	}

	return records
}

export const attachmentResolver: PreviewResolver = { name: 'attachment', resolve }
