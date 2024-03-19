import { BookSelectable } from './table.schema.js'
import { PieceFrontmatter, PieceFrontmatterJtdSchema } from '../../utils/frontmatter.js'

type BookFrontmatterOnlyFields = {
	date_read?: string
}

type BookFrontmatter = PieceFrontmatter<BookSelectable, BookFrontmatterOnlyFields>

const bookFrontmatterJtdSchema: PieceFrontmatterJtdSchema<BookFrontmatter> = {
	properties: {
		title: { type: 'string', nullable: false },
		author: { type: 'string', nullable: false },
	},
	optionalProperties: {
		id_ol_book: { type: 'string' },
		id_ol_work: { type: 'string' },
		isbn: { type: 'string' },
		subtitle: { type: 'string' },
		coauthors: { type: 'string' },
		description: { type: 'string' },
		pages: { type: 'uint32' },
		year_first_published: { type: 'uint32' },
		keywords: { type: 'string' },
		cover: {
			type: 'string',
			metadata: { luzzleFormat: 'attachment', luzzleEnum: ['jpg', 'png', 'svg', 'avif', 'webp'] },
		},
		date_read: {
			type: 'string',
			metadata: { luzzleFormat: 'date-string' },
		},
	},
}

export { bookFrontmatterJtdSchema, type BookFrontmatter }
