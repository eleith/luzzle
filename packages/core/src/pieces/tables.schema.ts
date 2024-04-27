import { Insertable, Updateable, Selectable } from 'kysely'
import {
	PieceTables,
	Piece,
	Pieces,
	PiecesCommonTable,
	PieceCommonDatabaseFields,
} from './types/index.js'

type PieceTable<P extends Pieces> = PieceTables[P]
type PieceInsertable<P extends Pieces = Pieces> = Insertable<PieceTable<P>>
type PieceUpdatable<P extends Pieces = Pieces> = Updateable<PieceTable<P>>
type PieceSelectable<P extends Pieces = Pieces> = Selectable<PieceTable<P>>
type PiecesCommonSelectable = Selectable<PiecesCommonTable>

export {
	type PieceSelectable,
	type PieceUpdatable,
	type PieceInsertable,
	type PieceTable,
	type PieceTables,
	type Pieces,
	type PiecesCommonTable,
	type PiecesCommonSelectable,
	type PieceCommonDatabaseFields,
	Piece,
}
