import { Book } from '@app/prisma'
import path from 'path'
import { bookCoverDir, BookMd, bookToString, getCoverPathForBook } from './book'
import YAML from 'yaml'

const bookMdSimple: BookMd = {
  filename: 'slugified-title.md',
  frontmatter: {
    title: 'title of the book',
    author: 'writer of book',
  },
  markdown: 'a note about the book',
}

const bookSimple: Book = {
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
}

const bookSimpleString = `---
${YAML.stringify({
  title: bookSimple.title,
  author: bookSimple.author,
  __database_cache: {
    id: bookSimple.id,
    date_added: bookSimple.date_added,
    date_updated: bookSimple.date_updated,
    slug: bookSimple.slug,
  },
})}---
`

describe('book', () => {
  test('getCoverPathforBook', () => {
    const bookMd = bookMdSimple
    const coverPath = getCoverPathForBook(bookMd)

    expect(coverPath).toBe(`${bookCoverDir}/${path.basename(bookMd.filename, '.md')}.jpg`)
  })

  test('bookToString', async () => {
    const book = bookSimple
    const bookString = await bookToString(book)

    expect(bookString).toBe(bookSimpleString)
  })
})
