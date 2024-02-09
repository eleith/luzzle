import { Selectable } from 'kysely'
import type { PieceCommonFields } from '../database.utils.js'
import { Pieces } from './pieces.js'

type PiecesViewTable = PieceCommonFields & {
	date_order: number
	from_piece: Pieces
	title: string
	media: string
}

type PiecesViewSelectable = Selectable<PiecesViewTable>

export { type PiecesViewTable, type PiecesViewSelectable }
