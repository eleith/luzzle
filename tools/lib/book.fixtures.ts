import { Book } from '@app/prisma'
import { omit } from 'lodash'
import { BookMd } from './book'

const title = 'title of the book'
const author = 'author of the book'
const note = 'a note about the book'
const slug = 'slugified-title'

function makeBookMd(
  overrides: Partial<BookMd | { frontmatter: Partial<BookMd['frontmatter']> }> = {}
): BookMd {
  return {
    filename: `${slug}.md`,
    frontmatter: {
      title,
      author,
      ...overrides.frontmatter,
    },
    markdown: note,
    ...omit(overrides, 'frontmatter'),
  }
}

function makeBook(overrides: Partial<Book> = {}): Book {
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
    date_added: new Date('2201-11-11'),
    date_updated: new Date('2201-11-11'),
    keywords: null,
    cover_width: null,
    cover_height: null,
    cover_path: null,
    slug,
    note,
    ...overrides,
  }
}

export { makeBookMd, makeBook }
