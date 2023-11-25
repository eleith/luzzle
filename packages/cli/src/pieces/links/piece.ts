import log from '../../lib/log.js'
import { Piece, toValidatedMarkDown, PieceType } from '../../lib/pieces/index.js'
import { createId } from '@paralleldrive/cuid2'
import { Config } from '../../lib/config.js'
import {
	LinkMarkdown,
	LinkType,
	LinkSelectable,
	LinkUpdateable,
	LinkInsertable,
	linkDatabaseJtdSchema,
	linkMarkdownJtdSchema,
} from './schema.js'
import { omit } from 'lodash-es'

class LinkPiece extends Piece<LinkType, LinkSelectable, LinkMarkdown> {
	constructor(piecesRoot: string) {
		super(piecesRoot, PieceType.Link, linkMarkdownJtdSchema, linkDatabaseJtdSchema)
	}

	async toCreateInput(markdown: LinkMarkdown): Promise<LinkInsertable> {
		const linkInput = {
			...omit(markdown.frontmatter, ['accessed_on', 'published_on']),
			id: createId(),
			slug: markdown.slug,
			note: markdown.markdown,
			active: markdown.frontmatter.active ? 1 : 0,
		} as LinkInsertable

		if (markdown.frontmatter.accessed_on) {
			linkInput.date_accessed = new Date(markdown.frontmatter.accessed_on).getTime()
		}

		if (markdown.frontmatter.published_on) {
			linkInput.date_published = new Date(markdown.frontmatter.published_on).getTime()
		}

		return linkInput
	}

	async toUpdateInput(
		markdown: LinkMarkdown,
		link: LinkSelectable,
		force = false
	): Promise<LinkUpdateable> {
		const linkUpdateInput = {
			...omit(markdown.frontmatter, ['accessed_on', 'published_on']),
			slug: markdown.slug,
			note: markdown.markdown,
			active: markdown.frontmatter.active ? 1 : 0,
			date_updated: new Date().getTime(),
		} as LinkUpdateable

		if (markdown.frontmatter.accessed_on) {
			linkUpdateInput.date_accessed = new Date(markdown.frontmatter.accessed_on).getTime()
		}

		if (markdown.frontmatter.published_on) {
			linkUpdateInput.date_published = new Date(markdown.frontmatter.published_on).getTime()
		}

		const linkKeys = Object.keys(linkUpdateInput) as Array<keyof typeof linkUpdateInput>

		// restrict updates to only fields that have changed between the md and db data
		linkKeys.forEach((field) => {
			if (!force && linkUpdateInput[field] === link[field]) {
				delete linkUpdateInput[field]
			}
		})

		return linkUpdateInput
	}

	async fetch(_config: Config, markdown: LinkMarkdown, service?: string): Promise<LinkMarkdown> {
		log.info(`fetching ${markdown.slug} with service ${service}`)
		return markdown
	}

	create(slug: string, title: string): LinkMarkdown {
		const now = new Date()
		const month = now.toLocaleString('default', { month: 'long' })
		const year = now.getFullYear()

		return toValidatedMarkDown(
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
