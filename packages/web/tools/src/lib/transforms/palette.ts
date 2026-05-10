import { getFrontmatterValues } from '@luzzle/core'
import type { TransformInput, AssetRecord } from './types.js'

export async function run({ webPiece, config, assetKeyToPath }: TransformInput): Promise<AssetRecord[]> {
	const pieceConfig = config.pieces.find((p) => p.type === webPiece.type)
	if (!pieceConfig?.fields.media?.length) return []

	const frontmatter = JSON.parse(webPiece.json_metadata)
	const hasMedia = pieceConfig.fields.media.some((field) =>
		getFrontmatterValues<string>(frontmatter, field)
			.flat()
			.some((key) => assetKeyToPath.has(key))
	)
	if (!hasMedia) return []

	const baseUrl = config.url.internal || config.url.app
	const url = `${baseUrl}/api/pieces/${webPiece.type}/${webPiece.slug}/transform/palette`
	const response = await fetch(url)

	if (!response.ok) {
		throw new Error(`palette transform failed: ${response.status} ${response.statusText}`)
	}

	const content = await response.text()

	return [
		{
			transformation: 'palette',
			asset_path: null,
			mime_type: 'application/json',
			is_embedded: 1,
			content,
		},
	]
}
