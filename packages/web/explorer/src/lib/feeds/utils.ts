import { type WebPieces } from '@luzzle/web.utils'
import { db } from '$lib/server/database'

const MAX_FEED_ITEMS = 50

async function getPiecesForFeed(type: WebPieces['type'] | undefined) {
	let pieceQuery = db
		.selectFrom('web_pieces')
		.selectAll()
		.orderBy('date_consumed', 'desc')
		.limit(MAX_FEED_ITEMS)

	if (type) {
		pieceQuery = pieceQuery.where('type', '=', type)
	}

	return pieceQuery.execute()
}

async function getPiecesForTagFeed(tag: string) {
	const pieceTags = await db
		.selectFrom('web_pieces_tags')
		.select('piece_id')
		.where('slug', '=', tag)
		.execute()

	if (!pieceTags || pieceTags.length === 0) {
		return []
	}

	const pieces = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where(
			'id',
			'in',
			pieceTags.map((x) => x.piece_id)
		)
		.orderBy('date_consumed', 'desc')
		.limit(MAX_FEED_ITEMS)
		.execute()

	return pieces
}

export { getPiecesForFeed, getPiecesForTagFeed }
