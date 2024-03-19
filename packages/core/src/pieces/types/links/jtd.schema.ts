import { LinkSelectable, LinkType } from './table.schema.js'
import { PieceFrontmatterJtdSchema, PieceFrontmatter } from '../../utils/frontmatter.js'

type LinkFrontMatterOnlyFields = {
	date_accessed?: string
	date_published?: string
	is_active: boolean
	is_paywall: boolean
}

type LinkFrontmatter = PieceFrontmatter<LinkSelectable, LinkFrontMatterOnlyFields>

const linkFrontmatterJtdSchema: PieceFrontmatterJtdSchema<LinkFrontmatter> = {
	properties: {
		title: { type: 'string', nullable: false },
		url: { type: 'string', nullable: false },
		is_active: { type: 'boolean', nullable: false, metadata: { luzzleFormat: 'boolean-int' } },
		is_paywall: { type: 'boolean', nullable: false, metadata: { luzzleFormat: 'boolean-int' } },
		type: { enum: [LinkType.Article, LinkType.Bookmark] },
	},
	optionalProperties: {
		author: { type: 'string' },
		subtitle: { type: 'string' },
		coauthors: { type: 'string' },
		summary: { type: 'string' },
		keywords: { type: 'string' },
		representative_image: {
			type: 'string',
			metadata: { luzzleFormat: 'attachment', luzzleEnum: ['jpg', 'png', 'svg', 'avif', 'webp'] },
		},
		archive_url: { type: 'string' },
		archive_path: { type: 'string' },
		date_published: { type: 'string', metadata: { luzzleFormat: 'date-string' } },
		date_accessed: { type: 'string', metadata: { luzzleFormat: 'date-string' } },
		word_count: { type: 'uint32' },
	},
}

export { linkFrontmatterJtdSchema, type LinkFrontmatter }
