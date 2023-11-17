import { merge } from 'lodash-es'
import { BookMarkdown, BookInsertable, BookUpdateable, BookSelectable } from './schema.js'

const id = 'book-id'
const title = 'title of the book'
const author = 'author of the book'
const note = 'a note about the book'
const slug = 'slugified-title'
const read_order = '19700101-y47d'

function makeBookMarkDown(overrides: DeepPartial<BookMarkdown> = {}): BookMarkdown {
	return merge(
		{
			slug,
			frontmatter: {
				title,
				author,
			},
			markdown: note,
		},
		overrides as BookMarkdown
	)
}

function makeBook(overrides: Partial<BookSelectable> = {}): BookSelectable {
	return {
		id: 'book-id',
		id_ol_book: null,
		id_ol_work: null,
		isbn: null,
		title,
		subtitle: null,
		author,
		coauthors: null,
		description: null,
		pages: null,
		year_read: null,
		month_read: null,
		year_first_published: null,
		date_added: new Date('2201-11-11').getTime(),
		date_updated: new Date('2201-11-11').getTime(),
		keywords: null,
		cover_width: null,
		cover_height: null,
		cover_path: null,
		slug,
		note,
		read_order,
		...overrides,
	}
}

function makeBookInsert(overrides: Partial<BookInsertable> = {}): BookInsertable {
	return {
		id: 'book-id',
		id_ol_book: null,
		id_ol_work: null,
		isbn: null,
		title,
		subtitle: null,
		author,
		coauthors: null,
		description: null,
		pages: null,
		year_read: null,
		month_read: null,
		year_first_published: null,
		keywords: null,
		cover_width: null,
		cover_height: null,
		cover_path: null,
		slug,
		note,
		read_order,
		...overrides,
	}
}

function makeBookUpdateInput(overrides: Partial<BookUpdateable> = {}): BookUpdateable {
	return {
		id: 'book-id',
		...overrides,
	}
}

function makeBookCreateInput(overrides: Partial<BookInsertable> = {}): BookInsertable {
	return {
		id,
		title,
		author,
		slug,
		read_order,
		...overrides,
	}
}

export { makeBookMarkDown, makeBook, makeBookInsert, makeBookUpdateInput, makeBookCreateInput }
