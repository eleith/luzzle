import { LinkSelectable, LinkType } from '../tables/links.schema.js'
import { PieceMarkdownJtdSchema, PieceDatabaseJtdSchema, PieceMarkdown } from './piece.js'

export type LinkDatabaseOnlyFields =
	| 'id'
	| 'date_added'
	| 'date_updated'
	| 'slug'
	| 'note'
	| 'date_accessed'
	| 'date_published'

type LinkFrontMatterOnlyFields = {
	published_on?: string
	accessed_on?: string
}

type LinkMarkdown = PieceMarkdown<LinkSelectable, LinkDatabaseOnlyFields, LinkFrontMatterOnlyFields>

const linkDatabaseJtdSchema: PieceDatabaseJtdSchema<LinkSelectable> = {
	properties: {
		id: { type: 'string' },
		date_added: { type: 'float64' },
		slug: { type: 'string' },
		title: { type: 'string' },
		url: { type: 'string' },
		active: { type: 'boolean' },
		type: { enum: [LinkType.Article, LinkType.Bookmark] },
	},
	optionalProperties: {
		author: { type: 'string' },
		subtitle: { type: 'string' },
		coauthors: { type: 'string' },
		summary: { type: 'string' },
		keywords: { type: 'string' },
		screenshot_path: { type: 'string' },
		archive_url: { type: 'string' },
		archive_path: { type: 'string' },
		note: { type: 'string' },
		date_updated: { type: 'float64' },
		date_accessed: { type: 'float64' },
		date_published: { type: 'float64' },
	},
}

const linkMarkdownJtdSchema: PieceMarkdownJtdSchema<LinkMarkdown> = {
	properties: {
		slug: { type: 'string' },
		frontmatter: {
			properties: {
				title: { type: 'string' },
				url: { type: 'string' },
				active: { type: 'boolean' },
				type: { enum: [LinkType.Article, LinkType.Bookmark] },
			},
			optionalProperties: {
				author: { type: 'string' },
				subtitle: { type: 'string' },
				coauthors: { type: 'string' },
				summary: { type: 'string' },
				keywords: { type: 'string' },
				screenshot_path: { type: 'string' },
				archive_url: { type: 'string' },
				archive_path: { type: 'string' },
				accessed_on: { type: 'string', metadata: { luzzleFormat: 'date-string' } },
				published_on: { type: 'string', metadata: { luzzleFormat: 'date-string' } },
			},
		},
	},
	optionalProperties: {
		markdown: { type: 'string' },
	},
}

export { linkMarkdownJtdSchema, linkDatabaseJtdSchema, type LinkMarkdown }
