import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { getPieces } from '$lib/server/pieces'
import { config } from '$lib/server/config'
import type { WebPiece } from '$lib/pieces/types'
import { makePieceItemInsertable } from '@luzzle/core'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { processMarkdown } from '$lib/server/markdown'

export const load: PageServerLoad = async ({ params }) => {
	const file = params.path
	const pieces = getPieces()
	const { type, slug } = pieces.parseFilename(file)

	if (!type) {
		return error(404, `piece type does not exist`)
	}

	const piece = await pieces.getPiece(type)
	const pieceMarkdown = await piece.get(file)
	const pieceConfig = config.pieces.find((p) => p.type === type)

	if (!pieceMarkdown) {
		return error(404, `piece does not exist`)
	}

	if (!pieceConfig) {
		return error(500, `piece config for ${type} not found`)
	}

	const insertable = makePieceItemInsertable(type, pieceMarkdown, await pieces.getSchema(type))
	const tagsValue = pieceConfig.fields.tags
		? piece.getField(pieceMarkdown, pieceConfig.fields.tags)
		: ''

	const tagsArray =
		(tagsValue as string)
			?.split(',')
			.map((t) => t.trim())
			.filter(Boolean) || []

	const webTags = tagsArray.map((tag) => ({
		slug: tag,
		tag: tag
	}))

	const webPiece: WebPiece = {
		slug,
		type: type as WebPiece['type'],
		id: insertable.id,
		key: generateAssetKey(pieceMarkdown.filePath, config.assets.salt),
		file_path: pieceMarkdown.filePath,
		title: piece.getField(pieceMarkdown, pieceConfig.fields.title) as string,
		summary: pieceConfig.fields.summary
			? (piece.getField(pieceMarkdown, pieceConfig.fields.summary) as string)
			: undefined,
		note: pieceMarkdown.note,
		keywords: JSON.stringify(tagsArray),
		date_added: new Date().getTime(),
		date_consumed: pieceConfig.fields.date_consumed
			? new Date(
					piece.getField(pieceMarkdown, pieceConfig.fields.date_consumed) as string
				).getTime()
			: undefined,
		json_metadata: insertable.frontmatter_json,
		assets: []
	}

	const note = await processMarkdown(insertable.note_markdown)

	return {
		piece: webPiece,
		tags: webTags,
		metadata: JSON.parse(insertable.frontmatter_json || '{}'),
		html_note: note,
		file
	}
}
