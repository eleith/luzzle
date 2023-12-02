import { LinkSelectable, LinkType } from '../tables/links.schema.js'
import { PieceFrontmatterJtdSchema, PieceDatabaseJtdSchema, PieceFrontmatter } from './piece.js'

export type LinkDatabaseOnlyFields =
	| 'id'
	| 'date_added'
	| 'date_updated'
	| 'slug'
	| 'note'
	| 'date_accessed'
	| 'date_published'
	| 'is_active'
	| 'is_paywall'

type LinkFrontMatterOnlyFields = {
	date_accessed?: string
	date_published?: string
	is_active: boolean
	is_paywall: boolean
}

type LinkFrontmatter = PieceFrontmatter<
	Omit<LinkSelectable, LinkDatabaseOnlyFields>,
	LinkFrontMatterOnlyFields
>

const linkDatabaseJtdSchema: PieceDatabaseJtdSchema<LinkSelectable> = {
	properties: {
		id: { type: 'string' },
		date_added: { type: 'float64' },
		slug: { type: 'string' },
		title: { type: 'string' },
		url: { type: 'string' },
		is_active: { type: 'uint8' },
		is_paywall: { type: 'uint8' },
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

const linkFrontmatterJtdSchema: PieceFrontmatterJtdSchema<LinkFrontmatter> = {
	properties: {
		title: { type: 'string' },
		url: { type: 'string' },
		is_active: { type: 'boolean', metadata: { luzzleFormat: 'boolean-int' } },
		is_paywall: { type: 'boolean', metadata: { luzzleFormat: 'boolean-int' } },
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
		date_published: { type: 'string', metadata: { luzzleFormat: 'date-string' } },
		date_accessed: { type: 'string', metadata: { luzzleFormat: 'date-string' } },
	},
}

export { linkFrontmatterJtdSchema, linkDatabaseJtdSchema, type LinkFrontmatter }
