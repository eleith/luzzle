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
			.selectAll('web_pieces')
			.select([
				'web_pieces_assets.asset_name',
				'web_pieces_assets.transformation',
				'web_pieces_assets.asset_path',
				'web_pieces_assets.mime_type',
				'web_pieces_assets.is_embedded',
				'web_pieces_assets.cached_content'
			])
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
