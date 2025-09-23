import { type WebPieces } from '$lib/pieces/types'
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

export { getPiecesForFeed }
