import log from '../../lib/log.js'
import { LinkMarkDown, linkMdValidator, cacheDatabaseSchema } from './link.schemas.js'
import { Piece, toValidatedMarkDown } from '../../lib/pieces/index.js'
import { createId } from '@paralleldrive/cuid2'
import { Link, LinkInsert, LinkUpdate, PieceTable } from '@luzzle/kysely'
import { Config } from '../../lib/config.js'

class LinkPiece extends Piece<typeof PieceTable.Links, Link, LinkMarkDown> {
	constructor(piecesRoot: string) {
		super(piecesRoot, PieceTable.Links, linkMdValidator, cacheDatabaseSchema)
	}

	async toCreateInput(markdown: LinkMarkDown): Promise<LinkInsert> {
		const accessedOn = markdown.frontmatter.accessed_on || new Date().getTime()
		const linkInput = {
			...markdown.frontmatter,
			id: createId(),
			slug: markdown.slug,
			note: markdown.markdown,
			date_accessed: new Date(accessedOn).getTime(),
		} as LinkInsert

		return linkInput
	}

	async toUpdateInput(linkMd: LinkMarkDown, link: Link, force = false): Promise<LinkUpdate> {
		const linkUpdateInput = {
			...linkMd.frontmatter,
			slug: linkMd.slug,
			note: linkMd.markdown,
			date_updated: new Date().getTime(),
		} as LinkUpdate

		const linkKeys = Object.keys(linkUpdateInput) as Array<keyof typeof linkUpdateInput>

		// restrict updates to only fields that have changed between the md and db data
		linkKeys.forEach((field) => {
			if (!force && linkUpdateInput[field] === link[field]) {
				delete linkUpdateInput[field]
			}
		})

		return linkUpdateInput
	}

	async attach(file: string, markdown: LinkMarkDown, field?: string): Promise<void> {
		const slug = markdown.slug
		log.info(`attaching ${file} to ${slug} to field ${field}`)
		return
	}

	async fetch(_config: Config, markdown: LinkMarkDown, service?: string): Promise<LinkMarkDown> {
		log.info(`fetching ${markdown.slug} with service ${service}`)
		return markdown
	}

	create(slug: string, title: string): LinkMarkDown {
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
