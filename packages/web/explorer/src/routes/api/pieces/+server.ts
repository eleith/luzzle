import { json, type RequestHandler } from '@sveltejs/kit'
import { type WebPieces } from '@luzzle/web.utils'
import { db, sql } from '$lib/server/database'
import { config } from '$lib/server/config'

const TAKE_DEFAULT = 50

export const GET: RequestHandler = async ({ request }) => {
	const url = new URL(request.url)
	const page = url.searchParams.get('page') || '1'
	const tag = url.searchParams.get('tag')
	const type = url.searchParams.get('type')
	const take = url.searchParams.get('take')
	const orderBy = url.searchParams.get('order') || 'consumed'
	const takeParseInt = take ? parseInt(take) : TAKE_DEFAULT
	const pageParseInt = parseInt(page)
	const pageNumber = isNaN(pageParseInt) ? 1 : pageParseInt
	const takeNumber = isNaN(takeParseInt) ? TAKE_DEFAULT : takeParseInt

	if (pageNumber < 1) {
		return new Response('no pieces for this page', { status: 404 })
	}

	if (type && config.pieces.map((x) => x.type).indexOf(type) === -1) {
		return new Response('invalid type', { status: 400 })
	}

	if (orderBy !== 'consumed' && orderBy !== 'random') {
		return new Response('invalid order', { status: 400 })
	}

	let piecesQuery = db.selectFrom('web_pieces').selectAll()

	if (type) {
		piecesQuery = piecesQuery.where('type', '=', type as WebPieces['type'])
	}

	if (tag) {
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
			return new Response('tag not found', { status: 404 })
		}
	}

	if (orderBy === 'random') {
		const pieces = await piecesQuery
			.where(({ eb, selectFrom }) =>
				eb(
					'id',
					'in',
					selectFrom('web_pieces')
						.select('id')
						.orderBy(sql`RANDOM()`)
						.limit(takeNumber)
				)
			)
			.execute()

		return json({
			pieces
		})
	} else {
		const pieces = await piecesQuery
			.offset(takeNumber * (pageNumber - 1))
			.orderBy('date_consumed', 'desc')
			.orderBy('date_added', 'desc')
			.limit(takeNumber + 1)
			.execute()

		if (pieces.length === takeNumber + 1) {
			pieces.pop()
		}

		return json({
			pieces,
			prevPage: pageNumber > 1 ? pageNumber - 1 : null,
			nextPage: pieces.length === takeNumber ? pageNumber + 1 : null
		})
	}
}
