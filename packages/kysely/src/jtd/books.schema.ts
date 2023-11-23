import { BookSelectable } from '../tables/books.schema.js'
import { PieceMarkdown, PieceMarkdownJtdSchema, PieceDatabaseJtdSchema } from './piece.js'

type BookDatabaseOnlyFields = 'id' | 'date_added' | 'date_updated' | 'slug' | 'read_order' | 'note'

type BookMarkdownOnlyFields = {
	cover_width?: number
	cover_height?: number
	cover_path?: string
}

type BookMarkdown = PieceMarkdown<BookSelectable, BookDatabaseOnlyFields, BookMarkdownOnlyFields>

const bookDatabaseJtdSchema: PieceDatabaseJtdSchema<BookSelectable> = {
	properties: {
		id: { type: 'string' },
		date_added: { type: 'float64' },
		slug: { type: 'string' },
		title: { type: 'string' },
		author: { type: 'string' },
		read_order: { type: 'string' },
	},
	optionalProperties: {
		id_ol_book: { type: 'string' },
		id_ol_work: { type: 'string' },
		isbn: { type: 'string' },
		subtitle: { type: 'string' },
		coauthors: { type: 'string' },
		description: { type: 'string' },
		pages: { type: 'uint32' },
		year_read: { type: 'uint32' },
		month_read: { type: 'uint32' },
		year_first_published: { type: 'uint32' },
		keywords: { type: 'string' },
		cover: {
			type: 'string',
			metadata: { luzzleFormat: 'attachment', luzzleAttachmentType: ['jpg', 'png', 'svg', 'avif'] },
		},
		note: { type: 'string' },
		date_updated: { type: 'float64' },
	},
}

const bookMarkdownJtdSchema: PieceMarkdownJtdSchema<BookMarkdown> = {
	properties: {
		slug: { type: 'string' },
		frontmatter: {
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
				year_read: { type: 'uint32' },
				month_read: { type: 'uint32' },
				year_first_published: { type: 'uint32' },
				keywords: { type: 'string' },
				cover: {
					type: 'string',
					metadata: { luzzleFormat: 'attachment', luzzleAttachmentType: ['png', 'jpg'] },
				},
				cover_path: { type: 'string' },
				cover_width: { type: 'uint32' },
				cover_height: { type: 'uint32' },
			},
		},
	},
	optionalProperties: {
		markdown: { type: 'string' },
	},
}

export { bookDatabaseJtdSchema, bookMarkdownJtdSchema, type BookMarkdown }
