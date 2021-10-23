import { Book } from '@app/prisma'
import { omit } from 'lodash'
import { BookMd } from './book'

function makeBookMd(
  overrides: Partial<BookMd | { frontmatter: Partial<BookMd['frontmatter']> }> = {}
): BookMd {
  return {
    filename: 'slugified-title.md',
    frontmatter: {
      title: 'title of the book',
      author: 'writer of book',
      ...overrides.frontmatter,
    },
    markdown: 'a note about the book',
    ...omit(overrides, 'frontmatter'),
  }
}

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-id',
    id_ol_book: null,
    id_ol_work: null,
    isbn: null,
    title: 'title of the book',
    subtitle: null,
    author: 'write of book',
    coauthors: null,
    description: null,
    pages: null,
    year_read: null,
    month_read: null,
    year_first_published: null,
    date_added: new Date('2201-11-11'),
    date_updated: new Date('2201-11-11'),
    keywords: null,
    cover_width: null,
    cover_height: null,
    cover_path: null,
    slug: 'book-simple',
    note: null,
    ...overrides,
  }
}

export { makeBookMd, makeBook }
