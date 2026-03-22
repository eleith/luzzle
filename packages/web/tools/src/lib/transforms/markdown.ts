import { getFrontmatterValues } from '@luzzle/core'
import type { TransformInput, AssetRecord } from './types.js'

export async function run({ webPiece, config, pieces }: TransformInput): Promise<AssetRecord[]> {
	const records: AssetRecord[] = []
	const baseUrl = `${config.url.app}/api/pieces/${webPiece.type}/${webPiece.slug}/transform/markdown`

	// Always render the note if it exists
	if (webPiece.note) {
		const response = await fetch(baseUrl)
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

	// Discover metadata fields with format: 'markdown' from the piece schema
	const piece = await pieces.getPiece(webPiece.type)
	const markdownFields = piece.fields.filter(
		(f) => f.type === 'string' && f.format === 'markdown'
	)

	if (markdownFields.length === 0) return records

	const frontmatter = JSON.parse(webPiece.json_metadata || '{}')

	for (const field of markdownFields) {
		const values = getFrontmatterValues<string>(frontmatter, field.name).flat()
		const value = values[0]
		if (!value || typeof value !== 'string') continue

		const url = `${baseUrl}?field=${encodeURIComponent(field.name)}`
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`markdown transform failed for field "${field.name}": ${response.status} ${response.statusText}`)
		}

		records.push({
			transformation: `markdown.${field.name}`,
			piece_asset_path: null,
			piece_field_path: field.name,
			asset_path: null,
			mime_type: 'text/html',
			is_embedded: 1,
			content: await response.text(),
		})
	}

	return records
}
