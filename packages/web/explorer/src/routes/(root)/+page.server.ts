import { db, mapRowsToWebPieces } from '$lib/server/database'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const latestPieceResult = await db
		.selectFrom('web_pieces')
		.select('id')
		.orderBy('date_consumed', 'desc')
		.orderBy('date_added', 'desc')
		.limit(1)
		.executeTakeFirst()

	let latestPiece = null
	if (latestPieceResult) {
		const rows = await db
			.selectFrom('web_pieces')
			.leftJoin('web_pieces_assets', 'web_pieces.file_path', 'web_pieces_assets.piece_file_path')
			.selectAll()
			.where('web_pieces.id', '=', latestPieceResult.id)
			.execute()
		latestPiece = mapRowsToWebPieces(rows)[0] || null
	}

	const types = await db
		.selectFrom('web_pieces')
		.select('type')
		.distinct()
		.orderBy('type', 'asc')
		.execute()

	return {
		latestPiece,
		types
	}
}
