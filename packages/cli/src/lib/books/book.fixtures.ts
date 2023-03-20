import { Book, Prisma } from '../prisma'
import { merge } from 'lodash'
import { BookMd } from './book.schemas'

const title = 'title of the book'
const author = 'author of the book'
const note = 'a note about the book'
const slug = 'slugified-title'
const read_order = '19700101-y47d'

function makeBookMd(overrides: DeepPartial<BookMd> = {}): BookMd {
  return merge(
    {
      filename: `${slug}.md`,
      frontmatter: {
        title,
        author,
      },
      markdown: note,
    },
    overrides as BookMd
  )
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
    read_order,
    ...overrides,
  }
}

function makeBookUpdateInput(
  overrides: Partial<Prisma.BookUpdateInput> = {}
): Prisma.BookUpdateInput {
  return {
    id: 'book-id',
    ...overrides,
  }
}

function makeBookCreateInput(
  overrides: Partial<Prisma.BookCreateInput> = {}
): Prisma.BookCreateInput {
  return {
    title,
    author,
    slug,
    read_order,
    ...overrides,
  }
}

export { makeBookMd, makeBook, makeBookUpdateInput, makeBookCreateInput }
