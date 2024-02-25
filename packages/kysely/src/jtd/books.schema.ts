import { BookSelectable } from '../tables/books.schema.js'
import { PieceFrontmatter, PieceFrontmatterJtdSchema, PieceDatabaseJtdSchema } from './piece.js'

type BookDatabaseOnlyFields = 'id' | 'date_added' | 'date_updated' | 'slug' | 'note' | 'date_read'

type BookFrontmatterOnlyFields = {
	date_read?: string
}

type BookFrontmatter = PieceFrontmatter<
	Omit<BookSelectable, BookDatabaseOnlyFields>,
	BookFrontmatterOnlyFields
>

const bookDatabaseJtdSchema: PieceDatabaseJtdSchema<BookSelectable> = {
	properties: {
		id: { type: 'string' },
		date_added: { type: 'float64' },
		slug: { type: 'string' },
		title: { type: 'string' },
		author: { type: 'string' },
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
		cover: { type: 'string' },
		note: { type: 'string' },
		date_updated: { type: 'float64' },
		date_read: { type: 'float64' },
	},
}

const bookFrontmatterJtdSchema: PieceFrontmatterJtdSchema<BookFrontmatter> = {
	properties: {
		title: { type: 'string' },
		author: { type: 'string' },
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

export { bookDatabaseJtdSchema, bookFrontmatterJtdSchema, type BookFrontmatter }
