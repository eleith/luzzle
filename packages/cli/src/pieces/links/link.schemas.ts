import { JTDSchemaType } from 'ajv/dist/jtd.js'
import pieceAjv from '../../lib/ajv.js'
import { Link, LinkType } from '@luzzle/kysely'
import { PieceMarkDown } from '../../lib/pieces/markdown.js'
import { PieceCache } from '../../lib/pieces/cache.js'

export type LinkDatabaseOnlyFields =
	| 'id'
	| 'date_added'
	| 'date_updated'
	| 'slug'
	| 'note'
	| 'date_accessed'
	| 'date_published'

export type LinkFrontMatterOnlyFields = {
	published_on?: string
	accessed_on?: string
}
export type LinkMarkDown = PieceMarkDown<Link, LinkDatabaseOnlyFields, LinkFrontMatterOnlyFields>
export type LinkCacheSchema = JTDSchemaType<PieceCache<Link>>
export type LinkSchema = JTDSchemaType<LinkMarkDown>

const linkMdSchema: LinkSchema = {
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

const cacheDatabaseSchema: LinkCacheSchema = {
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

const linkMdValidator = pieceAjv.compile<LinkMarkDown>(linkMdSchema)

export { linkMdSchema, cacheDatabaseSchema, linkMdValidator }
