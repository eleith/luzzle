import { Piece, PieceType, PieceMarkdown } from '../../lib/pieces/index.js'
import { TextFrontmatter, TextType, TextSelectable, textFrontmatterJtdSchema } from './schema.js'
import { LuzzleDatabase, makePieceMarkdownOrThrow } from '@luzzle/kysely'

class TextPiece extends Piece<TextType, TextSelectable, TextFrontmatter> {
	constructor(piecesRoot: string, db: LuzzleDatabase) {
		super(piecesRoot, PieceType.Text, textFrontmatterJtdSchema, db)
	}

	create(slug: string, title: string): PieceMarkdown<TextFrontmatter> {
		const markdown: TextFrontmatter = {
			title,
			summary: 'summary',
			date_published: new Date().toLocaleDateString(),
		}

		return makePieceMarkdownOrThrow(slug, 'notes', markdown, this.validator)
	}
}

export default TextPiece
