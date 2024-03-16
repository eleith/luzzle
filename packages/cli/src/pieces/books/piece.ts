import { Piece, PieceType } from '../../lib/pieces/index.js'
import { BookType, BookSelectable, BookFrontmatter, bookFrontmatterJtdSchema } from './schema.js'
import { LuzzleDatabase, makePieceMarkdownOrThrow, PieceMarkdown } from '@luzzle/kysely'

class BookPiece extends Piece<BookType, BookSelectable, BookFrontmatter> {
	constructor(piecesRoot: string, db: LuzzleDatabase) {
		super(piecesRoot, PieceType.Book, bookFrontmatterJtdSchema, db)
	}

	create(slug: string, title: string): PieceMarkdown<BookFrontmatter> {
		const markdown: BookFrontmatter = {
			title,
			author: 'author',
			isbn: '1234',
			description: 'description',
			id_ol_book: 'id1234',
			id_ol_work: 'id5678',
			coauthors: 'coauthors',
			date_read: new Date().toLocaleDateString(),
		}

		return makePieceMarkdownOrThrow(slug, 'notes', markdown, this.validator)
	}
}

export default BookPiece
