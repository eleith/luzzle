import { filterFrontmatterFields, resolveFieldPaths } from '@luzzle/core'
import type { PieceFrontmatterProperty } from '@luzzle/core'
import type { TransformInput, AssetRecord } from './types.js'

const isMarkdown = (f: PieceFrontmatterProperty) =>
	f.type === 'string' && f.format === 'markdown'

export async function run({ webPiece, config, pieces }: TransformInput): Promise<AssetRecord[]> {
	const records: AssetRecord[] = []
	const baseUrl = config.url.internal || config.url.app
	const urlBase = `${baseUrl}/api/pieces/${webPiece.type}/${webPiece.slug}/transform/markdown`

	if (webPiece.note) {
		const response = await fetch(urlBase)
		if (!response.ok) {
			throw new Error(`markdown transform failed: ${response.status} ${response.statusText}`)
		}

		records.push({
			transformation: 'markdown',
			piece_asset_path: null,
			asset_path: null,
			mime_type: 'text/html',
			is_embedded: 1,
			content: await response.text(),
		})
	}

	const piece = await pieces.getPiece(webPiece.type)
	const schemaPaths = filterFrontmatterFields(piece.fields, isMarkdown)
	const frontmatter = JSON.parse(webPiece.json_metadata || '{}')

	for (const schemaPath of schemaPaths) {
		const dataPaths = resolveFieldPaths(piece.fields, frontmatter, schemaPath)

		for (const fieldPath of dataPaths) {
			const url = `${urlBase}?field=${encodeURIComponent(fieldPath)}`
			const response = await fetch(url)
			if (!response.ok) {
				throw new Error(
					`markdown transform failed for field "${fieldPath}": ${response.status} ${response.statusText}`
				)
			}

			records.push({
				transformation: `markdown.${fieldPath}`,
				piece_asset_path: null,
				piece_field_path: fieldPath,
				asset_path: null,
				mime_type: 'text/html',
				is_embedded: 1,
				content: await response.text(),
			})
		}
	}

	return records
}
