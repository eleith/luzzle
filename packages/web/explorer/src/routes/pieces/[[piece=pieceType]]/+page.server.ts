import { db } from '$lib/server/database'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

const TAKE_DEFAULT = 50

export const load: PageServerLoad = async ({ params, url }) => {
	const type = params.piece
	const pageParam = url.searchParams.get('page') || '1'
	const pageNumber = parseInt(pageParam) || null

	let piecesQuery = db.selectFrom('web_pieces').selectAll()

	if (type) {
		piecesQuery = piecesQuery.where('type', '=', type)
	}

	if (pageNumber === null || pageNumber < 1) {
		redirect(302, url.pathname)
	}

	const pieces = await piecesQuery
		.orderBy('date_consumed', 'desc')
		.orderBy('date_added', 'desc')
		.offset((pageNumber - 1) * TAKE_DEFAULT)
		.limit(TAKE_DEFAULT + 1)
		.execute()

	if (pieces.length === 0 && pageNumber > 1) {
		redirect(302, url.pathname)
	}

	if (pieces.length === TAKE_DEFAULT + 1) {
		pieces.pop()
	}

	return {
		pieces,
		nextPage: pieces.length === TAKE_DEFAULT ? pageNumber + 1 : null
	}
}
