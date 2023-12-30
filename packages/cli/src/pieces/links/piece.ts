import log from '../../lib/log.js'
import { Piece, toValidatedMarkdown, PieceType } from '../../lib/pieces/index.js'
import { Config } from '../../lib/config.js'
import {
	LinkFrontmatter,
	LinkType,
	LinkSelectable,
	LuzzleLinkType,
	linkDatabaseJtdSchema,
	linkFrontmatterJtdSchema,
} from './schema.js'
import { PieceMarkdown } from 'src/lib/pieces/markdown.js'
import { merge } from 'lodash-es'
import { availability } from './wayback.js'
import { generateTags, generateSummary, generateClassification } from './openai.js'

class LinkPiece extends Piece<LinkType, LinkSelectable, LinkFrontmatter> {
	constructor(piecesRoot: string) {
		super(piecesRoot, PieceType.Link, linkFrontmatterJtdSchema, linkDatabaseJtdSchema)
	}

	async fetch(
		config: Config,
		markdown: PieceMarkdown<LinkFrontmatter>,
		service?: string
	): Promise<PieceMarkdown<LinkFrontmatter>> {
		const apiKeys = config.get('api_keys')
		const openAIKey = apiKeys.openai
		const linkProcessed = merge({}, markdown)

		if (service && /openai|all/.test(service)) {
			if (openAIKey) {
				const tags = await generateTags(openAIKey, markdown)
				const summary = await generateSummary(openAIKey, markdown)
				const classification = await generateClassification(openAIKey, markdown)

				log.info(`generating openAI summary for ${markdown.frontmatter.url}`)

				linkProcessed.frontmatter.keywords = tags.join(', ')
				linkProcessed.frontmatter.summary = summary
				linkProcessed.frontmatter.is_paywall = classification.is_paywall
				linkProcessed.frontmatter.type = classification.is_article
					? LuzzleLinkType.Article
					: LuzzleLinkType.Bookmark
			} else {
				log.warn('openAI key not found')
			}
		}

		if (service && /wayback|all/.test(service)) {
			const waybackAvailability = await availability(markdown.frontmatter.url)
			if (waybackAvailability) {
				const closest = waybackAvailability.archived_snapshots.closest
				if (closest.available) {
					linkProcessed.frontmatter.archive_url = closest.url
				}
			}
		}

		return linkProcessed
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
				type: LuzzleLinkType.Article,
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
