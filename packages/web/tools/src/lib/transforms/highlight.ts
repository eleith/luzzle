import { getFrontmatterValues } from '@luzzle/core'
import languages from './highlight/languages.json' with { type: 'json' }
import type { TransformInput, AssetRecord } from './types.js'

const extToLang = new Map<string, string>()
for (const [id, aliases] of Object.entries(languages) as [string, string[]][]) {
	extToLang.set(id, id)
	for (const alias of aliases) {
		extToLang.set(alias, id)
	}
}

export function getHighlightLang(filename: string): string | null {
	const dot = filename.lastIndexOf('.')
	const ext = dot === -1 ? '' : filename.slice(dot + 1).toLowerCase()
	return extToLang.get(ext) ?? null
}

export async function run({ webPiece, config }: TransformInput): Promise<AssetRecord[]> {
	const pieceConfig = config.pieces.find((p) => p.type === webPiece.type)
	if (!pieceConfig?.fields.attachments) return []

	const frontmatter = JSON.parse(webPiece.json_metadata)
	const records: AssetRecord[] = []

	for (const field of pieceConfig.fields.attachments) {
		const assets = getFrontmatterValues<string>(frontmatter, field)
			.flat()
			.filter((s) => typeof s === 'string')

		for (const asset of assets) {
			const lang = getHighlightLang(asset)
			if (!lang) continue

			const url = `${config.url.app}/api/pieces/${webPiece.type}/${webPiece.slug}/transform/highlight?attachment=${encodeURIComponent(asset)}`
			const response = await fetch(url)

			if (response.status === 404) continue

			if (!response.ok) {
				throw new Error(`highlight transform failed: ${response.status} ${response.statusText}`)
			}

			const content = await response.text()

			records.push({
				transformation: 'highlight',
				piece_asset_path: asset,
				asset_path: '',
				mime_type: 'text/html',
				is_embedded: 1,
				content,
			})
		}
	}

	return records
}
