import { getFrontmatterValues } from '@luzzle/core'
import { getPalette } from './vibrant.js'
import type { TransformInput, AssetRecord } from '../utils/types.js'

export async function run({
	webPiece,
	config,
	pieces,
	assetKeyToPath,
}: TransformInput): Promise<AssetRecord[]> {
	const pieceConfig = config.pieces.find((p) => p.type === webPiece.type)
	if (!pieceConfig?.fields.media?.length) return []

	const frontmatter = JSON.parse(webPiece.json_metadata)

	let assetPath: string | undefined
	for (const field of pieceConfig.fields.media) {
		const keys = getFrontmatterValues<string>(frontmatter, field).flat()
		for (const key of keys) {
			const path = assetKeyToPath.get(key)
			if (path) {
				assetPath = path
				break
			}
		}
		if (assetPath) break
	}

	if (!assetPath) return []

	const buffer = await pieces.getPieceAsset(assetPath)
	const palette = await getPalette(buffer)

	return [
		{
			transformation: 'palette',
			asset_path: null,
			mime_type: 'application/json',
			is_embedded: 1,
			content: JSON.stringify(palette),
		},
	]
}
