import { Insertable, Updateable, Selectable } from 'kysely'
import { BookFrontmatter } from './types/books/index.js'
import { LinkFrontmatter } from './types/links/index.js'
import { TextFrontmatter } from './types/texts/index.js'
import { PieceCommonDatabaseFields } from './types/common.js'
import { SchemaDateStringToDatabaseNumber } from '../database/utils.js'

const Piece = {
	Book: 'books',
	Link: 'links',
	Text: 'texts',
} as const

type Pieces = (typeof Piece)[keyof typeof Piece]

type PieceTables = {
	[Piece.Book]: SchemaDateStringToDatabaseNumber<BookFrontmatter> & PieceCommonDatabaseFields
	[Piece.Link]: SchemaDateStringToDatabaseNumber<LinkFrontmatter> & PieceCommonDatabaseFields
	[Piece.Text]: SchemaDateStringToDatabaseNumber<TextFrontmatter> & PieceCommonDatabaseFields
}

type PiecesCommonTable = {
	type: Pieces
	title: string
	summary: string | null
	media: string | null
	json_metadata: string | null
	date_consumed: number | null
} & PieceCommonDatabaseFields

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
