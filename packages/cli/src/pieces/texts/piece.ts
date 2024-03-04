import log from '../../lib/log.js'
import { Piece, PieceType, PieceMarkdown } from '../../lib/pieces/index.js'
import { Config } from '../../lib/config.js'
import { TextFrontmatter, TextType, TextSelectable, textFrontmatterJtdSchema } from './schema.js'
import { LuzzleDatabase, makePieceMarkdownOrThrow } from '@luzzle/kysely'

class TextPiece extends Piece<TextType, TextSelectable, TextFrontmatter> {
	constructor(piecesRoot: string, db: LuzzleDatabase) {
		super(piecesRoot, PieceType.Text, textFrontmatterJtdSchema, db)
	}

	async fetch(
		_: Config,
		markdown: PieceMarkdown<TextFrontmatter>
	): Promise<PieceMarkdown<TextFrontmatter>> {
		return markdown
	}

	create(slug: string, title: string): PieceMarkdown<TextFrontmatter> {
		const markdown: TextFrontmatter = {
			title,
			summary: 'summary',
			date_published: new Date().toLocaleDateString(),
		}

		return makePieceMarkdownOrThrow(slug, 'notes', markdown, this.validator)
	}

	async process(_: Config, slugs: string[], dryRun = false) {
		log.info(`processing ${slugs.length} links with dryRun: ${dryRun}`)
	}
}

export default TextPiece
