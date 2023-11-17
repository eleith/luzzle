import {
	bookDatabaseJtdSchema,
	bookMarkdownJtdSchema,
	PieceSelectable,
	Piece,
	PieceUpdatable,
	PieceInsertable,
	type BookMarkdown,
} from '@luzzle/kysely'

type BookType = typeof Piece.Book
type BookSelectable = PieceSelectable<BookType>
type BookUpdateable = PieceUpdatable<BookType>
type BookInsertable = PieceInsertable<BookType>

export {
	bookMarkdownJtdSchema,
	bookDatabaseJtdSchema,
	type BookType,
	type BookSelectable,
	type BookInsertable,
	type BookUpdateable,
	type BookMarkdown,
}
