import { getFrontmatterValues } from '@luzzle/core'
import type { TransformInput, AssetRecord } from '../utils/types.js'

export async function run({
	webPiece,
	config,
	assetKeyToPath,
}: TransformInput): Promise<AssetRecord[]> {
	const pieceConfig = config.pieces.find((p) => p.type === webPiece.type)
	if (!pieceConfig?.fields.attachments) return []

	const frontmatter = JSON.parse(webPiece.json_metadata)
	const attachments = pieceConfig.fields.attachments
	const records: AssetRecord[] = []

	for (const field of attachments) {
		const values = getFrontmatterValues<string>(frontmatter, field).flat()

		const assets = values.reduce(
			(maps, key) => {
				const path = assetKeyToPath.get(key)

				if (path) {
					maps.push({ path, key })
				}
				return maps
			},
			[] as { path: string; key: string }[]
		)

		for (const asset of assets) {
			const baseUrl = config.network?.internal?.explorer || config.url.app
			const url = `${baseUrl}/api/pieces/${webPiece.type}/${webPiece.slug}/transform/highlight?attachment=${encodeURIComponent(asset.key)}`
			const response = await fetch(url)

			if (!response.ok) {
				throw new Error(`highlight transform failed: ${response.status} ${response.statusText}`)
			}

			const content = await response.text()

			records.push({
				transformation: 'highlight',
				piece_asset_path: asset.path,
				asset_path: null,
				mime_type: 'text/html',
				is_embedded: 1,
				content,
			})
		}
	}

	return records
}
