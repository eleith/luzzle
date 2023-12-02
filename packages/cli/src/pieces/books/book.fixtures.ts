import { merge } from 'lodash-es'
import { PieceMarkdown } from '../../lib/pieces/index.js'
import { BookFrontmatter, BookInsertable, BookUpdateable, BookSelectable } from './schema.js'

const id = 'book-id'
const title = 'title of the book'
const author = 'author of the book'
const note = 'a note about the book'
const slug = 'slugified-title'

function makeBookMarkDown(
	overrides: DeepPartial<PieceMarkdown<BookFrontmatter>> = {}
): PieceMarkdown<BookFrontmatter> {
	return merge(
		{
			slug,
			frontmatter: {
				title,
				author,
			},
			note,
		},
		overrides as PieceMarkdown<BookFrontmatter>
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
		year_first_published: null,
		date_added: new Date('2201-11-11').getTime(),
		date_updated: new Date('2201-11-11').getTime(),
		keywords: null,
		cover: null,
		slug,
		note,
		date_read: null,
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
		year_first_published: null,
		keywords: null,
		cover: null,
		slug,
		note,
		date_read: null,
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
		...overrides,
	}
}

export { makeBookMarkDown, makeBook, makeBookInsert, makeBookUpdateInput, makeBookCreateInput }
