import { db } from '#lib/server/database/index.js'
import { getConfiguredPieceTypes } from '#lib/pieces/types.server.js'

export function selectTaggedPieces(tag: string) {
	const ids = db.selectFrom('web_pieces_tags').select('piece_id').where('slug', '=', tag)
	return db
		.selectFrom('web_pieces')
		.selectAll()
		.where('id', 'in', ids)
		.where('type', 'in', getConfiguredPieceTypes())
}
