import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { getPieces } from '$lib/server/pieces'
import { processMarkdown } from '$lib/server/markdown'
import { config } from '$lib/server/config'
import type { WebPieces } from '@luzzle/web.utils'
import { makePieceItemInsertable } from '@luzzle/core'

export const load: PageServerLoad = async ({ params }) => {
	const file = params.path
	const pieces = getPieces()
	const { type, slug } = pieces.parseFilename(file)

	if (!type) {
		return error(404, `piece type does not exist`)
	}

	const piece = await pieces.getPiece(type)
	const pieceMarkdown = await piece.get(file)
	const schema = await pieces.getSchema(type)

	if (!pieceMarkdown) {
		return error(404, `piece does not exist`)
	}

	const pieceConfig = config.pieces.find((p) => p.type === type)

	if (!pieceConfig) {
		return error(500, `piece config for ${type} not found`)
	}

	const insert = makePieceItemInsertable(type, pieceMarkdown, schema)
	const frontmatter = JSON.parse(insert.frontmatter_json || '{}')

	const webPiece: WebPieces = {
		slug,
		type: type as WebPieces['type'],
		id: 'preview',
		file_path: insert.file_path,
		title: frontmatter[pieceConfig.fields.title] as string,
		summary: pieceConfig.fields.summary
			? (frontmatter[pieceConfig.fields.summary] as string)
			: undefined,
		note: insert.note_markdown,
		media: pieceConfig.fields.media ? (frontmatter[pieceConfig.fields.media] as string) : undefined,
		keywords: pieceConfig.fields.tags
			? (frontmatter[pieceConfig.fields.tags] as string)
			: undefined,
		date_added: new Date().getTime(),
		date_consumed: pieceConfig.fields.date_consumed
			? new Date(frontmatter[pieceConfig.fields.date_consumed] as string).getTime()
			: undefined,
		json_metadata: insert.frontmatter_json
	}

	const note = await processMarkdown(webPiece.note || '')
	const webTags = (JSON.parse(webPiece.keywords || '[]') as string[])?.map((tag) => ({
		slug: tag,
		tag: tag
	}))

	return {
		piece: webPiece,
		tags: webTags,
		metadata: JSON.parse(webPiece.json_metadata || '{}'),
		html_note: note,
		file
	}
}
