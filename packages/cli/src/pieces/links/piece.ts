import log from '../../lib/log.js'
import { Piece, toValidatedMarkdown, PieceType } from '../../lib/pieces/index.js'
import { Config } from '../../lib/config.js'
import {
	LinkFrontmatter,
	LinkType,
	LinkSelectable,
	linkDatabaseJtdSchema,
	linkFrontmatterJtdSchema,
} from './schema.js'
import { PieceMarkdown } from 'src/lib/pieces/markdown.js'

class LinkPiece extends Piece<LinkType, LinkSelectable, LinkFrontmatter> {
	constructor(piecesRoot: string) {
		super(piecesRoot, PieceType.Link, linkFrontmatterJtdSchema, linkDatabaseJtdSchema)
	}

	async fetch(
		_config: Config,
		markdown: PieceMarkdown<LinkFrontmatter>,
		service?: string
	): Promise<PieceMarkdown<LinkFrontmatter>> {
		log.info(`fetching ${markdown.slug} with service ${service}`)
		return markdown
	}

	create(slug: string, title: string): PieceMarkdown<LinkFrontmatter> {
		const now = new Date()
		const month = now.toLocaleString('default', { month: 'long' })
		const year = now.getFullYear()

		return toValidatedMarkdown(
			slug,
			'notes',
			{
				title,
				summary: 'summary',
				url: 'https://example.com',
				active: true,
				type: 'article',
				accessed_on: `${month} ${year}`,
				published_on: `${month} ${year}`,
			},
			this.validator
		)
	}

	async process(slugs: string[], dryRun = false) {
		log.info(`processing ${slugs} with dryRun: ${dryRun}`)
		return
	}
}

export default LinkPiece
