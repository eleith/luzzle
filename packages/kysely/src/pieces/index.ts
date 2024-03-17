import {
	bookFrontmatterJtdSchema,
	linkFrontmatterJtdSchema,
	textFrontmatterJtdSchema,
} from '../jtd/index.js'

import { Piece, Pieces } from '../tables/pieces.schema.js'

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

export * from './markdown.js'
export * from './frontmatter.js'
export * from './database.js'
export { getPieceSchema }
