import { db, mapRowsToWebPieces, sql } from '$lib/server/database'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

const MAX_RESULTS = 20

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('query')
	const pageParam = url.searchParams.get('page') || '1'
	const pageNumber = parseInt(pageParam) || null

	if (pageNumber === null || pageNumber < 1) {
		redirect(302, url.pathname)
	}

	if (!query) {
		redirect(302, '/')
	}

	const escapedQuery = `"${query.replace(/"/g, '""')}"`

	const idsResult = await db
		.selectFrom('web_pieces_fts5')
		.select('id')
		.where(sql`web_pieces_fts5`, sql`match`, escapedQuery)
		.orderBy(sql`bm25(web_pieces_fts5, 1, 1, 1, 10, 3, 2, 1, 3, 3, 1, 1, 1)`)
		.offset((pageNumber - 1) * MAX_RESULTS)
		.limit(MAX_RESULTS + 1)
		.execute()

	const ids = idsResult.map((x) => x.id)

	if (ids.length === 0 && pageNumber > 1) {
		redirect(302, url.pathname)
	}

	const hasMore = ids.length === MAX_RESULTS + 1
	if (hasMore) {
		ids.pop()
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
		.where('web_pieces.id', 'in', ids)
		.execute()

	const pieces = mapRowsToWebPieces(rows)

	return {
		pieces,
		query,
		nextPage: hasMore ? pageNumber + 1 : null
	}
}
