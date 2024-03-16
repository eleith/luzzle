import { Piece, PieceType, PieceMarkdown } from '../../lib/pieces/index.js'
import {
	LinkFrontmatter,
	LinkType,
	LinkSelectable,
	LuzzleLinkType,
	linkFrontmatterJtdSchema,
} from './schema.js'
import { LuzzleDatabase, makePieceMarkdownOrThrow } from '@luzzle/kysely'

class LinkPiece extends Piece<LinkType, LinkSelectable, LinkFrontmatter> {
	constructor(piecesRoot: string, db: LuzzleDatabase) {
		super(piecesRoot, PieceType.Link, linkFrontmatterJtdSchema, db)
	}

	create(slug: string, title: string): PieceMarkdown<LinkFrontmatter> {
		const markdown: LinkFrontmatter = {
			title,
			summary: 'summary',
			url: 'https://example.com',
			is_active: true,
			is_paywall: false,
			type: LuzzleLinkType.Article,
			date_accessed: new Date().toLocaleDateString(),
			date_published: new Date().toLocaleDateString(),
		}

		return makePieceMarkdownOrThrow(slug, 'notes', markdown, this.validator)
	}
}

export default LinkPiece
