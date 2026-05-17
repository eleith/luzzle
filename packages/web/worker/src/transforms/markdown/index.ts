import { filterFrontmatterFields, getFrontmatterValues, resolveFieldPaths } from '@luzzle/core'
import type { PieceFrontmatterProperty } from '@luzzle/core'
import { processMarkdown } from './engine.js'
import type { TransformInput, AssetRecord } from '../utils/types.js'

const isMarkdown = (f: PieceFrontmatterProperty) =>
	f.type === 'string' && f.format === 'markdown'

export async function run({ webPiece, config, pieces }: TransformInput): Promise<AssetRecord[]> {
	const records: AssetRecord[] = []
	const themes = {
		light: config.theme.markdown.code.light,
		dark: config.theme.markdown.code.dark,
	}

	if (webPiece.note) {
		const html = await processMarkdown(webPiece.note, themes)
		records.push({
			transformation: 'markdown',
			piece_asset_path: null,
			asset_path: null,
			mime_type: 'text/html',
			is_embedded: 1,
			content: html,
		})
	}

	const piece = await pieces.getPiece(webPiece.type)
	const schemaPaths = filterFrontmatterFields(piece.fields, isMarkdown)
	const frontmatter = JSON.parse(webPiece.json_metadata || '{}')

	for (const schemaPath of schemaPaths) {
		const dataPaths = resolveFieldPaths(piece.fields, frontmatter, schemaPath)

		for (const fieldPath of dataPaths) {
			const values = getFrontmatterValues<string>(frontmatter, fieldPath).flat()
			const value = values[0]
			if (typeof value !== 'string' || !value) continue

			const html = await processMarkdown(value, themes)
			records.push({
				transformation: `markdown.${fieldPath}`,
				piece_asset_path: null,
				piece_field_path: fieldPath,
				asset_path: null,
				mime_type: 'text/html',
				is_embedded: 1,
				content: html,
			})
		}
	}

	return records
}
