import { TextSelectable } from './table.schema.js'
import { PieceFrontmatterJtdSchema, PieceFrontmatter } from '../../utils/frontmatter.js'

type TextFrontMatterOnlyFields = {
	date_published?: string
	attachments?: string[]
}

type TextFrontmatter = PieceFrontmatter<TextSelectable, TextFrontMatterOnlyFields>

const textFrontmatterJtdSchema: PieceFrontmatterJtdSchema<TextFrontmatter> = {
	properties: {
		title: { type: 'string', nullable: false },
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

export { textFrontmatterJtdSchema, type TextFrontmatter }
