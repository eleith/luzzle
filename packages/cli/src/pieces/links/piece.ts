import log from '../../lib/log.js'
import { Piece, PieceType, PieceMarkdown } from '../../lib/pieces/index.js'
import { Config } from '../../lib/config.js'
import {
	LinkFrontmatter,
	LinkType,
	LinkSelectable,
	LuzzleLinkType,
	linkFrontmatterJtdSchema,
} from './schema.js'
import { merge } from 'lodash-es'
import { availability } from './wayback.js'
import { generateTags, generateSummary, generateClassification } from './openai.js'
import { LuzzleDatabase, makePieceMarkdownOrThrow } from '@luzzle/kysely'

class LinkPiece extends Piece<LinkType, LinkSelectable, LinkFrontmatter> {
	constructor(piecesRoot: string, db: LuzzleDatabase) {
		super(piecesRoot, PieceType.Link, linkFrontmatterJtdSchema, db)
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
				log.info(`generating openAI summary for ${markdown.slug}`)

				const tags = await generateTags(openAIKey, markdown)
				const summary = await generateSummary(openAIKey, markdown)
				const classification = await generateClassification(openAIKey, markdown)

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
			log.info(`generating wayback availability for ${markdown.slug}`)

			const waybackAvailability = await availability(markdown.frontmatter.url)

			if (waybackAvailability) {
				const closest = waybackAvailability.archived_snapshots.closest
				if (closest && closest.available) {
					linkProcessed.frontmatter.archive_url = closest.url
				}
			}
		}

		return linkProcessed
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

	async process(_: Config, slugs: string[], dryRun = false) {
		log.info(`processing ${slugs.length} links with dryRun: ${dryRun}`)
	}
}

export default LinkPiece
