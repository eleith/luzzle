import { Insertable, Updateable, Selectable } from 'kysely'
import { BooksTable } from './books.schema.js'
import { LinksTable } from './links.schema.js'
import { TextsTable } from './texts.schema.js'
import type { PieceCommonFields } from '../database.utils.js'

const Piece = {
	Book: 'books',
	Link: 'links',
	Text: 'texts',
} as const

type Pieces = (typeof Piece)[keyof typeof Piece]

type PieceTables = {
	[Piece.Book]: BooksTable
	[Piece.Link]: LinksTable
	[Piece.Text]: TextsTable
}

type PiecesCommonTable = PieceCommonFields & {
	type: Pieces
	title: string
	summary: string | null
	media: string | null
	json_metadata: string | null
	date_consumed: number | null
}

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
	Piece,
}
