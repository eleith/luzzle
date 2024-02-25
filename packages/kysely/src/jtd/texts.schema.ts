import { TextSelectable } from '../tables/texts.schema.js'
import { PieceFrontmatterJtdSchema, PieceDatabaseJtdSchema, PieceFrontmatter } from './piece.js'

export type TextDatabaseOnlyFields =
	| 'id'
	| 'date_added'
	| 'date_updated'
	| 'slug'
	| 'note'
	| 'date_published'
	| 'attachments'

type TextFrontMatterOnlyFields = {
	date_published?: string
	attachments?: string[]
}

type TextFrontmatter = PieceFrontmatter<
	Omit<TextSelectable, TextDatabaseOnlyFields>,
	TextFrontMatterOnlyFields
>

const textDatabaseJtdSchema: PieceDatabaseJtdSchema<TextSelectable> = {
	properties: {
		id: { type: 'string' },
		date_added: { type: 'float64' },
		slug: { type: 'string' },
		title: { type: 'string' },
	},
	optionalProperties: {
		subtitle: { type: 'string' },
		summary: { type: 'string' },
		keywords: { type: 'string' },
		representative_image: { type: 'string' },
		attachments: { type: 'string' },
		note: { type: 'string' },
		date_updated: { type: 'float64' },
		date_published: { type: 'float64' },
	},
}

const textFrontmatterJtdSchema: PieceFrontmatterJtdSchema<TextFrontmatter> = {
	properties: {
		title: { type: 'string' },
	},
	optionalProperties: {
		subtitle: { type: 'string' },
		summary: { type: 'string' },
		keywords: { type: 'string' },
		attachments: { elements: { type: 'string', metadata: { luzzleFormat: 'attachment' } } },
		representative_image: {
			type: 'string',
			metadata: { luzzleFormat: 'attachment', luzzleEnum: ['jpg', 'png', 'svg', 'avif', 'webp'] },
		},
		date_published: { type: 'string', metadata: { luzzleFormat: 'date-string' } },
	},
}

export { textFrontmatterJtdSchema, textDatabaseJtdSchema, type TextFrontmatter }
