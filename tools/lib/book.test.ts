import { Book } from '@app/prisma'
import path from 'path'
import {
  bookCoverDir,
  BookMd,
  bookToString,
  filterRecentlyUpdatedBooks,
  getCoverPathForBook,
  makeBookMd,
} from './book'
import YAML from 'yaml'
import { Stats } from 'fs'
import { mocked } from 'ts-jest/utils'

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

const mockStat = jest.fn().mockImplementation(async (): Promise<Stats> => {
  const stat = { mtime: new Date('2201-11-11') } as Stats
  return Promise.resolve(stat)
})

jest.mock('fs', () => ({
  promises: {
    stat: (path: string) => mockStat(path),
    readdir: jest.fn(),
    copyFile: jest.fn(),
    unlinke: jest.fn(),
  },
  existsSync: jest.fn(),
}))

jest.mock('./web', () => ({
  downloadTo: jest.fn(),
}))

jest.mock('./google-books', () => ({
  findVolume: jest.fn(),
}))

jest.mock('./open-library', () => ({
  getCoverUrl: jest.fn(),
  getWorkFromBook: jest.fn(),
}))

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

  test('makeBookMd', async () => {
    const bookMd = bookMdSimple
    const bookMd2 = makeBookMd(bookMd.filename, bookMd.markdown, bookMd.frontmatter)

    expect(bookMd2).toEqual(bookMd)
  })

  test('makeBookMd throws on invalidation', async () => {
    const bookMd = {
      filename: bookMdSimple.filename,
      markdown: bookMdSimple.markdown,
      frontmatter: {
        ...bookMdSimple.frontmatter,
        badField: 'badData',
      },
    }
    const args = [bookMd.filename, bookMd.markdown, bookMd.frontmatter] as const

    expect(() => makeBookMd(...args)).toThrow()
  })

  test('filterRecentlyUpdatedBooks', async () => {
    const bookSlugs = ['one', 'two', 'three']
    const books: Pick<Book, 'date_updated' | 'slug'>[] = [
      { date_updated: new Date('2200-11-11'), slug: 'one' },
      { date_updated: new Date('2200-11-11'), slug: 'two' },
      { date_updated: new Date('2200-11-11'), slug: 'three' },
    ]
    const dir = 'dirPath'
    const updated = await filterRecentlyUpdatedBooks(bookSlugs, books, dir)

    expect(mockStat).toHaveBeenCalledTimes(3)
    expect(mockStat).toHaveBeenLastCalledWith('dirPath/three.md')
    expect(updated).toHaveLength(3)
  })
})
