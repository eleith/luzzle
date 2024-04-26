import { Piece, Pieces } from './tables.schema.js'
import { BookFrontmatterJSONSchema } from './types/books/index.js'
import { PieceFrontmatter } from './utils/frontmatter.js'
import { JSONSchemaType } from 'ajv'
import { LinkFrontmatterJSONSchema } from './types/links/index.js'
import { TextFrontmatterJSONSchema } from './types/texts/index.js'

function getPieceSchema(table: Pieces): JSONSchemaType<PieceFrontmatter> {
	switch (table) {
		case Piece.Book:
			return BookFrontmatterJSONSchema as JSONSchemaType<PieceFrontmatter>
		case Piece.Link:
			return LinkFrontmatterJSONSchema as JSONSchemaType<PieceFrontmatter>
		case Piece.Text:
			return TextFrontmatterJSONSchema as JSONSchemaType<PieceFrontmatter>
		default:
			throw new Error(`Invalid piece type: ${table}`)
	}
}

export { getPieceSchema }
