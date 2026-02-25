import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db, mapRowsToWebPieces } from '$lib/server/database'
import { config } from '$lib/server/config'
import { processMarkdown } from '$lib/server/markdown'

export const load: PageServerLoad = async (page) => {
	const type = page.params.piece
	const slug = page.params.slug

	const rows = await db
		.selectFrom('web_pieces')
		.leftJoin('web_pieces_assets', 'web_pieces.file_path', 'web_pieces_assets.piece_file_path')
		.selectAll()
		.where('web_pieces.type', '=', type)
		.where('web_pieces.slug', '=', slug)
		.execute()

	const pieces = mapRowsToWebPieces(rows)
	const piece = pieces[0]

	if (!piece) {
		return error(404, `piece does not exist`)
	}

	const tags = await db
		.selectFrom('web_pieces_tags')
		.select(['slug', 'tag'])
		.distinct()
		.where('piece_id', '=', piece.id)
		.execute()

	const metadata = JSON.parse(piece.json_metadata || '{}') as Record<string, unknown>
	const note = piece.note ? await processMarkdown(piece.note) : null

	const ogAsset = piece.assets.find((a) => a.transformation === 'image.opengraph')

	return {
		piece,
		tags,
		metadata,
		html_note: note,
		meta: {
			title: `${piece.title} | ${config.content.text.title}`,
			type: piece.type,
			description: piece.summary,
			image: ogAsset ? `${config.url.luzzle_assets}/pieces/assets/${ogAsset.asset_path}` : undefined
		}
	}
}
