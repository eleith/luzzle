import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db, mapRowsToWebPieces } from '$lib/server/database'

const TAKE_DEFAULT = 50

export const load: PageServerLoad = async (page) => {
	const tag = page.params.tag

	const pieceTags = await db
		.selectFrom('web_pieces_tags')
		.selectAll()
		.where('slug', '=', tag)
		.execute()

	if (!pieceTags.length) {
		return error(404, 'tag not found')
	}

	const ids = pieceTags.map((x) => x.piece_id)

	const idQuery = db
		.selectFrom('web_pieces')
		.select('id')
		.where('id', 'in', ids)
		.orderBy('date_consumed', 'desc')
		.limit(TAKE_DEFAULT + 1)

	const pageIds = (await idQuery.execute()).map((x) => x.id)

	const hasMore = pageIds.length === TAKE_DEFAULT + 1
	if (hasMore) {
		pageIds.pop()
	}

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
		.where('web_pieces.id', 'in', pageIds)
		.orderBy('date_consumed', 'desc')
		.execute()

	const pieces = mapRowsToWebPieces(rows)

	return {
		pieces,
		nextPage: hasMore ? 2 : null,
		prevPage: null,
		tag
	}
}
