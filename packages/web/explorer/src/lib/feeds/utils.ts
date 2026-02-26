import { db } from '$lib/server/database'
import type { WebPiece } from '$lib/pieces/types'
import { hydrateWithAssets } from '$lib/pieces/assets.server'

const MAX_FEED_ITEMS = 50

async function getPiecesForFeed(type: WebPiece['type'] | undefined) {
	let query = db
		.selectFrom('web_pieces')
		.selectAll()
		.orderBy('date_consumed', 'desc')
		.limit(MAX_FEED_ITEMS)

	if (type) {
		query = query.where('type', '=', type)
	}

	const pieces = await query.execute()
	return hydrateWithAssets(pieces)
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

	const ids = pieceTags.map((x) => x.piece_id)

	const query = db
		.selectFrom('web_pieces')
		.selectAll()
		.where('id', 'in', ids)
		.orderBy('date_consumed', 'desc')
		.limit(MAX_FEED_ITEMS)

	const pieces = await query.execute()
	return hydrateWithAssets(pieces)
}

export { getPiecesForFeed, getPiecesForTagFeed }
