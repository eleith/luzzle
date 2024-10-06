import { getDatabase } from '$lib/database'
import type { PageServerLoad } from './$types'

const TAKE_DEFAULT = 50

export const load: PageServerLoad = async (page) => {
	const db = getDatabase()
	const type = page.params.piece
	let piecesQuery = db.selectFrom('web_pieces').selectAll()

	if (type) {
		piecesQuery = piecesQuery.where('type', '=', type)
	}

	const pieces = await piecesQuery
		.orderBy('date_consumed', 'desc')
		.limit(TAKE_DEFAULT + 1)
		.execute()

	if (pieces.length === TAKE_DEFAULT + 1) {
		pieces.pop()
	}

	return {
		pieces,
		nextPage: pieces.length === TAKE_DEFAULT ? 2 : null,
		prevPage: null
	}
}

export const prerender = true
