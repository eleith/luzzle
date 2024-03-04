import {
	bookFrontmatterJtdSchema,
	PieceSelectable,
	Piece,
	PieceUpdatable,
	PieceInsertable,
	type BookFrontmatter,
} from '@luzzle/kysely'

type BookType = typeof Piece.Book
type BookSelectable = PieceSelectable<BookType>
type BookUpdateable = PieceUpdatable<BookType>
type BookInsertable = PieceInsertable<BookType>

export {
	bookFrontmatterJtdSchema,
	type BookType,
	type BookSelectable,
	type BookInsertable,
	type BookUpdateable,
	type BookFrontmatter,
}
