import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { getDatabase } from '$lib/database'

const TAKE_DEFAULT = 50

export const load: PageServerLoad = async (page) => {
	const tag = page.params.tag
	const db = getDatabase()

	let piecesQuery = db.selectFrom('web_pieces').selectAll()

	const pieceTags = await db
		.selectFrom('web_pieces_tags')
		.selectAll()
		.where('slug', '=', tag)
		.execute()

	if (pieceTags) {
		piecesQuery = piecesQuery.where(
			'id',
			'in',
			pieceTags.map((x) => x.piece_id)
		)
	} else {
		return error(404, 'tag not found')
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

export const prerender = false
