import { Piece, Pieces } from './tables.schema.js'
import { BookFrontmatter, bookFrontmatterJtdSchema } from './types/books/jtd.schema.js'
import { LinkFrontmatter, linkFrontmatterJtdSchema } from './types/links/jtd.schema.js'
import { TextFrontmatter, textFrontmatterJtdSchema } from './types/texts/jtd.schema.js'
import { PieceFrontmatterJtdSchema } from './utils/frontmatter.js'

type PieceFrontmatterJtdSchemas = {
	[Piece.Book]: PieceFrontmatterJtdSchema<BookFrontmatter>
	[Piece.Link]: PieceFrontmatterJtdSchema<LinkFrontmatter>
	[Piece.Text]: PieceFrontmatterJtdSchema<TextFrontmatter>
}

function getPieceSchema(table: Pieces) {
	switch (table) {
		case Piece.Book:
			return bookFrontmatterJtdSchema
		case Piece.Link:
			return linkFrontmatterJtdSchema
		case Piece.Text:
			return textFrontmatterJtdSchema
		default:
			throw new Error(`Invalid piece type: ${table}`)
	}
}

export { getPieceSchema, type PieceFrontmatterJtdSchemas }

export {
	type PieceFrontmatterJtdSchema,
	type PieceFrontmatter,
	type PieceFrontmatterFields,
	type PieceFrontmatterLuzzleMetadata,
	type PieceFrontmatterSchemaField,
	getPieceFrontmatterKeysFromSchema,
	formatPieceFrontmatterValue,
	unformatPieceFrontmatterValue,
	extractFrontmatterSchemaField,
	initializePieceFrontMatter,
} from './utils/frontmatter.js'

export {
	type PieceMarkdown,
	PieceMarkdownError,
	makePieceMarkdownOrThrow,
	makePieceMarkdown,
	makePieceMarkdownString,
} from './utils/markdown.js'

export { makePieceInsertable, makePieceUpdatable } from './utils/database.js'
