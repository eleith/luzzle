import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { getPieces } from '$lib/server/pieces'
import { processMarkdown } from '$lib/server/markdown'
import { config } from '$lib/server/config'
import type { WebPieces } from '@luzzle/web.utils'

export const load: PageServerLoad = async ({ params }) => {
	const file = params.path
	const pieces = getPieces()
	const { type, slug } = pieces.parseFilename(file)

	if (!type) {
		return error(404, `piece type does not exist`)
	}

	const piece = await pieces.getPiece(type)
	const pieceMarkdown = await piece.get(file)

	if (!pieceMarkdown) {
		return error(404, `piece does not exist`)
	}

	const pieceConfig = config.pieces.find((p) => p.type === type)

	if (!pieceConfig) {
		return error(500, `piece config for ${type} not found`)
	}

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

	const webPiece: WebPieces = {
		slug,
		type: type as WebPieces['type'],
		id: 'preview',
		key: 'preview',
		file_path: pieceMarkdown.filePath,
		title: piece.getField(pieceMarkdown, pieceConfig.fields.title) as string,
		summary: pieceConfig.fields.summary
			? (piece.getField(pieceMarkdown, pieceConfig.fields.summary) as string)
			: undefined,
		note: pieceMarkdown.note,
		media: pieceConfig.fields.media
			? (piece.getField(pieceMarkdown, pieceConfig.fields.media) as string)
			: undefined,
		keywords: JSON.stringify(tagsArray),
		date_added: new Date().getTime(),
		date_consumed: pieceConfig.fields.date_consumed
			? new Date(
					piece.getField(pieceMarkdown, pieceConfig.fields.date_consumed) as string
				).getTime()
			: undefined,
		json_metadata: JSON.stringify(pieceMarkdown.frontmatter)
	}

	const note = await processMarkdown(webPiece.note || '')

	return {
		piece: webPiece,
		tags: webTags,
		metadata: pieceMarkdown.frontmatter as Record<string, unknown>,
		html_note: note,
		file
	}
}
