import { type WebPieces } from '@luzzle/web.utils'
import { db, mapRowsToWebPieces } from '$lib/server/database'

const MAX_FEED_ITEMS = 50

async function getPiecesForFeed(type: WebPieces['type'] | undefined) {
	let idQuery = db
		.selectFrom('web_pieces')
		.select('id')
		.orderBy('date_consumed', 'desc')
		.limit(MAX_FEED_ITEMS)

	if (type) {
		idQuery = idQuery.where('type', '=', type)
	}

	const ids = (await idQuery.execute()).map((x) => x.id)

	if (ids.length === 0) {
		return []
	}

	const rows = await db
		.selectFrom('web_pieces')
		.leftJoin('web_pieces_assets', 'web_pieces.file_path', 'web_pieces_assets.piece_file_path')
		.selectAll()
		.where('web_pieces.id', 'in', ids)
		.orderBy('date_consumed', 'desc')
		.execute()

	return mapRowsToWebPieces(rows)
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

	const idQuery = db
		.selectFrom('web_pieces')
		.select('id')
		.where('id', 'in', ids)
		.orderBy('date_consumed', 'desc')
		.limit(MAX_FEED_ITEMS)

	const pageIds = (await idQuery.execute()).map((x) => x.id)

	if (pageIds.length === 0) {
		return []
	}

	const rows = await db
		.selectFrom('web_pieces')
		.leftJoin('web_pieces_assets', 'web_pieces.file_path', 'web_pieces_assets.piece_file_path')
		.selectAll()
		.where('web_pieces.id', 'in', pageIds)
		.orderBy('date_consumed', 'desc')
		.execute()

	return mapRowsToWebPieces(rows)
}

export { getPiecesForFeed, getPiecesForTagFeed }
