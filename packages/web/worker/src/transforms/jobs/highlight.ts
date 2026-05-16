import { getFrontmatterValues } from '@luzzle/core'
import { codeToHtml } from 'shiki'
import { getLang } from '../../lib/highlight-lang.js'
import type { TransformInput, AssetRecord } from '../utils/types.js'

export async function run({
	webPiece,
	config,
	pieces,
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
			const lang = getLang(asset.path) || 'text'
			const buffer = await pieces.getPieceAsset(asset.path)
			const code = buffer.toString('utf-8')

			const html = await codeToHtml(code, {
				lang,
				defaultColor: false,
				themes: {
					light: config.theme.markdown.code.light,
					dark: config.theme.markdown.code.dark,
				},
			})

			records.push({
				transformation: 'highlight',
				piece_asset_path: asset.path,
				asset_path: null,
				mime_type: 'text/html',
				is_embedded: 1,
				content: html,
			})
		}
	}

	return records
}
