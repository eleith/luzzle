import { db, sql } from '$lib/server/database'
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

	let piecesQuery = db.selectFrom('web_pieces').selectAll()

	if (type) {
		piecesQuery = piecesQuery.where('type', '=', type)
	}

	piecesQuery = piecesQuery
		.orderBy('date_consumed', 'desc')
		.orderBy('date_added', 'desc')
		.offset((pageNumber - 1) * TAKE_DEFAULT)
		.limit(TAKE_DEFAULT + 1)

	if (yearNumber) {
		piecesQuery = piecesQuery.where(sql`strftime('%Y', datetime(web_pieces.date_consumed/1000, 'unixepoch'))`, '=', yearNumber.toString())
	}

	const pieces = await piecesQuery.execute()

	if (pieces.length === 0 && pageNumber > 1) {
		redirect(302, url.pathname)
	}

	if (pieces.length === TAKE_DEFAULT + 1) {
		pieces.pop()
	}

	return {
		pieces,
		nextPage: pieces.length === TAKE_DEFAULT ? pageNumber + 1 : null,
		page: pageNumber,
		year: yearNumber
	}
}
