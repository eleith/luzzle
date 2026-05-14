import {
	filterFrontmatterFields,
	resolveFieldPaths,
	getFrontmatterValues,
	type PieceFrontmatterProperty
} from '@luzzle/core'
import { generateAssetKey } from '$lib/pieces/assets.key.server'
import { processMarkdown } from '$lib/server/markdown.js'
import type { PreviewAssetRecord, PreviewContext, PreviewResolver } from './types.js'

const isMarkdown = (f: PieceFrontmatterProperty) => f.type === 'string' && f.format === 'markdown'

async function resolve(context: PreviewContext): Promise<PreviewAssetRecord[]> {
	const { frontmatter, note, filePath, config, pieces, type } = context
	const records: PreviewAssetRecord[] = []
	const fileKey = generateAssetKey(filePath, config.assets.salt)

	if (note) {
		const html = await processMarkdown(note)
		records.push({
			asset_key: fileKey,
			transformation: 'markdown',
			piece_asset_path: null,
			asset_path: null,
			mime_type: 'text/html',
			is_embedded: 1,
			content: html
		})
	}

	const piece = await pieces.getPiece(type)
	const schemaPaths = filterFrontmatterFields(piece.fields, isMarkdown)

	for (const schemaPath of schemaPaths) {
		const dataPaths = resolveFieldPaths(piece.fields, frontmatter, schemaPath)

		for (const fieldPath of dataPaths) {
			const values = getFrontmatterValues<string>(frontmatter, fieldPath).flat()
			const value = values[0]
			if (typeof value !== 'string' || !value) continue

			const html = await processMarkdown(value)
			records.push({
				asset_key: fileKey,
				transformation: `markdown.${fieldPath}`,
				piece_asset_path: null,
				asset_path: null,
				mime_type: 'text/html',
				is_embedded: 1,
				content: html
			})
		}
	}

	return records
}

export const markdownResolver: PreviewResolver = { name: 'markdown', resolve }
