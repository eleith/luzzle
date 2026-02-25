import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db, mapRowsToWebPieces } from '$lib/server/database'

import type { PieceMode } from '$lib/pieces/helpers'

export const load: PageServerLoad = async (page) => {
	const type = page.params.piece
	const slug = page.params.slug
	const mode = (page.url.searchParams.get('mode') as PieceMode) || 'public'

	const rows = await db
		.selectFrom('web_pieces')
		.leftJoin('web_pieces_assets', 'web_pieces.file_path', 'web_pieces_assets.piece_file_path')
		.selectAll('web_pieces')
		.select([
			'web_pieces_assets.asset_name',
			'web_pieces_assets.transformation',
			'web_pieces_assets.asset_path',
			'web_pieces_assets.size',
			'web_pieces_assets.mime_type',
			'web_pieces_assets.is_embedded',
			'web_pieces_assets.cached_content'
		])
		.where('web_pieces.type', '=', type)
		.where('web_pieces.slug', '=', slug)
		.execute()

	const pieces = mapRowsToWebPieces(rows)
	const piece = pieces[0]

	if (!piece) {
		return error(404, `piece does not exist`)
	}

	return {
		piece,
		mode
	}
}
