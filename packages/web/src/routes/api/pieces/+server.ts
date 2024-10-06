import { json, type RequestHandler } from '@sveltejs/kit'
import { WebPieceTypesRegExp, type WebPieces } from '$lib/pieces/types'
import { getDatabase } from '$lib/database'

const TAKE_DEFAULT = 50

type PostBody = {
	page?: string
	tag?: string
	type?: string
}

export const POST: RequestHandler = async ({ request }) => {
	const postBody = (await request.json()) as PostBody
	const { page = '1', tag, type } = postBody
	const pageParseInt = parseInt(page)
	const pageNumber = isNaN(pageParseInt) ? 1 : pageParseInt
	const db = getDatabase()

	if (pageNumber < 1) {
		return new Response('no pieces for this page', { status: 404 })
	}

	if (type && !WebPieceTypesRegExp.test(type)) {
		return new Response('invalid type', { status: 400 })
	}

	let piecesQuery = db.selectFrom('web_pieces').selectAll()

	if (type) {
		piecesQuery = piecesQuery.where('type', '=', type as WebPieces['type'])
	}

	if (tag) {
		const oneTag = await db
			.selectFrom('tags')
			.selectAll()
			.where('slug', '=', tag)
			.executeTakeFirstOrThrow()

		if (oneTag) {
			const tagMap = await db
				.selectFrom('tag_maps')
				.selectAll()
				.where('id_tag', '=', oneTag.id)
				.execute()

			piecesQuery = piecesQuery.where(
				'id',
				'in',
				tagMap.map((x) => x.id_item)
			)
		} else {
			return new Response('tag not found', { status: 404 })
		}
	}

	const pieces = await piecesQuery
		.offset(TAKE_DEFAULT * (pageNumber - 1))
		.orderBy('date_consumed', 'desc')
		.limit(TAKE_DEFAULT + 1)
		.execute()

	if (pieces.length === TAKE_DEFAULT + 1) {
		pieces.pop()
	}

	return json({
		pieces,
		prevPage: pageNumber > 1 ? pageNumber - 1 : null,
		nextPage: pieces.length === TAKE_DEFAULT ? pageNumber + 1 : null
	})
}
