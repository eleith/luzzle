import { db, mapRowsToWebPieces, sql } from '$lib/server/database'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

const TAKE_DEFAULT = 50

export const load: PageServerLoad = async ({ params, url }) => {
	const type = params.piece
	const pageParam = url.searchParams.get('page') || '1'
	const pageNumber = parseInt(pageParam) || null
	const yearParam = url.searchParams.get('year') || null
	const yearNumber = yearParam ? parseInt(yearParam) || null : null

	if (pageNumber === null || pageNumber < 1) {
		redirect(302, url.pathname)
	}

	let idQuery = db.selectFrom('web_pieces').select('id')

	if (type) {
		idQuery = idQuery.where('type', '=', type)
	}

	if (yearNumber) {
		idQuery = idQuery.where(
			sql`strftime('%Y', datetime(web_pieces.date_consumed/1000, 'unixepoch'))`,
			'=',
			yearNumber.toString()
		)
	}

	idQuery = idQuery
		.orderBy('date_consumed', 'desc')
		.orderBy('date_added', 'desc')
		.offset((pageNumber - 1) * TAKE_DEFAULT)
		.limit(TAKE_DEFAULT + 1)

	const ids = (await idQuery.execute()).map((x) => x.id)

	if (ids.length === 0 && pageNumber > 1) {
		redirect(302, url.pathname)
	}

	const hasMore = ids.length === TAKE_DEFAULT + 1
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
		.orderBy('date_consumed', 'desc')
		.orderBy('date_added', 'desc')
		.execute()

	const pieces = mapRowsToWebPieces(rows)

	return {
		pieces,
		nextPage: hasMore ? pageNumber + 1 : null,
		page: pageNumber,
		year: yearNumber
	}
}
