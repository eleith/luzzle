import { json, type RequestHandler } from '@sveltejs/kit'
import { type WebPieces } from '@luzzle/web.utils'
import { db, mapRowsToWebPieces, sql } from '$lib/server/database'
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

	let piecesQuery = db
		.selectFrom('web_pieces')
		.leftJoin('web_pieces_assets', 'web_pieces.file_path', 'web_pieces_assets.piece_file_path')
		.selectAll()

	if (type) {
		piecesQuery = piecesQuery.where('web_pieces.type', '=', type as WebPieces['type'])
	}

	if (tag) {
		const pieceTags = await db
			.selectFrom('web_pieces_tags')
			.selectAll()
			.where('slug', '=', tag)
			.execute()

		if (pieceTags) {
			piecesQuery = piecesQuery.where(
				'web_pieces.id',
				'in',
				pieceTags.map((x) => x.piece_id)
			)
		} else {
			return new Response('tag not found', { status: 404 })
		}
	}

	if (orderBy === 'random') {
		const rows = await piecesQuery
			.where(({ eb, selectFrom }) =>
				eb(
					'web_pieces.id',
					'in',
					selectFrom('web_pieces')
						.select('id')
						.orderBy(sql`RANDOM()`)
						.limit(takeNumber)
				)
			)
			.execute()

		return json({
			pieces: mapRowsToWebPieces(rows)
		})
	} else {
		// Pagination with Joins is tricky because one piece can have multiple assets.
		// We should first get the IDs of the pieces for this page, then fetch them with assets.
		let idQuery = db
			.selectFrom('web_pieces')
			.select('id')
			.offset(takeNumber * (pageNumber - 1))
			.orderBy('date_consumed', 'desc')
			.orderBy('date_added', 'desc')
			.limit(takeNumber + 1)

		if (type) {
			idQuery = idQuery.where('type', '=', type as WebPieces['type'])
		}

		if (tag) {
			const pieceTags = await db
				.selectFrom('web_pieces_tags')
				.selectAll()
				.where('slug', '=', tag)
				.execute()

			if (pieceTags) {
				idQuery = idQuery.where(
					'id',
					'in',
					pieceTags.map((x) => x.piece_id)
				)
			}
		}

		const ids = (await idQuery.execute()).map((x) => x.id)
		const hasMore = ids.length === takeNumber + 1
		if (hasMore) {
			ids.pop()
		}

		const rows = await db
			.selectFrom('web_pieces')
			.leftJoin('web_pieces_assets', 'web_pieces.file_path', 'web_pieces_assets.piece_file_path')
			.selectAll()
			.where('web_pieces.id', 'in', ids)
			.orderBy('date_consumed', 'desc')
			.orderBy('date_added', 'desc')
			.execute()

		const pieces = mapRowsToWebPieces(rows)

		return json({
			pieces,
			prevPage: pageNumber > 1 ? pageNumber - 1 : null,
			nextPage: hasMore ? pageNumber + 1 : null
		})
	}
}
