import { Insertable, Updateable, Selectable } from 'kysely'
import { BooksTable } from './books.schema.js'
import { LinksTable } from './links.schema.js'

const Piece = {
	Book: 'books',
	Link: 'links',
} as const

type Pieces = (typeof Piece)[keyof typeof Piece]

type PieceTables = {
	[Piece.Book]: BooksTable
	[Piece.Link]: LinksTable
}

type PieceTable<P extends Pieces> = PieceTables[P]
type PieceInsertable<P extends Pieces = Pieces> = Insertable<PieceTable<P>>
type PieceUpdatable<P extends Pieces = Pieces> = Updateable<PieceTable<P>>
type PieceSelectable<P extends Pieces = Pieces> = Selectable<PieceTable<P>>

export {
	type PieceSelectable,
	type PieceUpdatable,
	type PieceInsertable,
	type PieceTable,
	type PieceTables,
	type Pieces,
	Piece,
}
