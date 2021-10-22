import { Book } from '@app/prisma'
import path from 'path'
import {
  bookCoverDir,
  bookToString,
  extractBooksOnDisk,
  filterRecentlyUpdatedBooks,
  getCoverPathForBook,
  makeBookMd,
  readBookDir,
} from './book'
import { Dirent, Stats, existsSync } from 'fs'
import { readdir, copyFile, unlink, stat } from 'fs/promises'
import * as fixtures from './book.fixtures'
import { mocked } from 'ts-jest/utils'
import { addFrontMatter, extract } from './md'
import { downloadTo } from './web'
import { findVolume } from './google-books'
import { getCoverUrl, getWorkFromBook } from './open-library'
import log from './log'

jest.mock('./log')
jest.mock('./md')
jest.mock('fs')
jest.mock('fs/promises')
jest.mock('./web')
jest.mock('./open-library')
jest.mock('./google-books')

const mocks = {
  addFrontMatter: mocked(addFrontMatter),
  readdir: mocked(readdir),
  extract: mocked(extract),
  copyFile: mocked(copyFile),
  existSync: mocked(existsSync),
  unlink: mocked(unlink),
  stat: mocked(stat),
  downloadTo: mocked(downloadTo),
  findVolume: mocked(findVolume),
  getCoverUrl: mocked(getCoverUrl),
  getWorkFromBook: mocked(getWorkFromBook),
  logError: mocked(log.error),
}

describe('book', () => {
  afterEach(() => {
    const mockKeys = Object.keys(mocks) as (keyof typeof mocks)[]

    mockKeys.forEach((key) => {
      mocks[key].mockReset()
    })
  })

  test('getCoverPathforBook', () => {
    const bookMd = fixtures.makeBookMd()
    const coverPath = getCoverPathForBook(bookMd)

    expect(coverPath).toBe(`${bookCoverDir}/${path.basename(bookMd.filename, '.md')}.jpg`)
  })

  test('bookToString', async () => {
    const book = fixtures.makeBook()
    const randomBookString = 'a tale of two scripts'

    mocks.addFrontMatter.mockReturnValue(randomBookString)
    const bookString = await bookToString(book)

    expect(bookString).toBe(randomBookString)
  })

  test('makeBookMd', async () => {
    const bookMd = fixtures.makeBookMd()
    const bookMd2 = makeBookMd(bookMd.filename, bookMd.markdown, bookMd.frontmatter)

    expect(bookMd2).toEqual(bookMd)
  })

  test('makeBookMd throws on invalidation', async () => {
    const bookMdSimple = fixtures.makeBookMd()
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

  test('readBookDir', async () => {
    const dir = 'dirPath'
    const filesInDir = [
      {
        name: 'one.md',
        isFile: () => true,
      },
      {
        name: 'two.md',
        isFile: () => true,
      },
      {
        name: 'three.md',
        isFile: () => true,
      },
      {
        name: 'image.jpg',
        isFile: () => true,
      },
      {
        name: 'assets',
        isFile: () => false,
      },
    ] as Dirent[]
    mocks.readdir.mockImplementation(async () => {
      return Promise.resolve(filesInDir)
    })

    const files = await readBookDir(dir)

    expect(mocks.readdir).toHaveBeenCalledTimes(1)
    expect(mocks.readdir).toHaveBeenCalledWith(dir, { withFileTypes: true })
    expect(files).toHaveLength(3)
    expect(files).toEqual(['one', 'two', 'three'])
  })

  test('filterRecentlyUpdatedBooks', async () => {
    const bookSlugs = ['one', 'two', 'three']
    const updatedAwhileAgo = new Date('2200-11-11')
    const updatedRecently = new Date('2202-11-11')
    const updatedDate = new Date('2201-11-11')
    const books: Pick<Book, 'date_updated' | 'slug'>[] = [
      { date_updated: updatedAwhileAgo, slug: 'one' },
      { date_updated: updatedAwhileAgo, slug: 'two' },
      { date_updated: updatedRecently, slug: 'three' },
    ]
    const dir = 'dirPath'

    mocks.stat.mockImplementation(async () => {
      const stat = { mtime: updatedDate } as Stats
      return Promise.resolve(stat)
    })

    const updated = await filterRecentlyUpdatedBooks(bookSlugs, books, dir)

    expect(mocks.stat).toHaveBeenCalledTimes(3)
    expect(updated).toEqual(['one', 'two'])
  })

  test('filterRecentlyUpdatedBooks handles new files', async () => {
    const bookSlugs = ['one', 'two', 'three', 'four']
    const updatedAwhileAgo = new Date('2200-11-11')
    const updatedDate = new Date('2199-11-11')
    const books: Pick<Book, 'date_updated' | 'slug'>[] = [
      { date_updated: updatedAwhileAgo, slug: 'one' },
      { date_updated: updatedAwhileAgo, slug: 'two' },
      { date_updated: updatedAwhileAgo, slug: 'three' },
    ]
    const dir = 'dirPath'

    mocks.stat.mockImplementation(async () => {
      const stat = { mtime: updatedDate } as Stats
      return Promise.resolve(stat)
    })

    const updated = await filterRecentlyUpdatedBooks(bookSlugs, books, dir)

    expect(mocks.stat).toHaveBeenCalledTimes(3)
    expect(updated).toEqual(['four'])
  })

  test('extractBooksOnDisk', async () => {
    const bookMds = [fixtures.makeBookMd(), fixtures.makeBookMd()]
    const bookSlugs = bookMds.map((bookMd) => path.basename(bookMd.filename, '.md'))
    const dir = 'dirPath'

    bookMds.forEach((bookMd) => {
      mocks.extract.mockImplementationOnce(async () => {
        return Promise.resolve(bookMd) as ReturnType<typeof mocks.extract>
      })
    })

    const bookMdsExtracted = await extractBooksOnDisk(bookSlugs, dir)

    expect(mocks.extract).toHaveBeenCalledTimes(bookSlugs.length)
    expect(mocks.extract).toHaveBeenCalledWith(`${dir}/${bookSlugs[0]}.md`)
    expect(bookMdsExtracted).toEqual(bookMds)
  })

  test('extractBooksOnDisk logs error', async () => {
    const bookMds = [fixtures.makeBookMd()]
    const bookSlugs = bookMds.map((bookMd) => path.basename(bookMd.filename, '.md'))
    const extractError = new Error('extraction epic failure')
    const dir = 'dirPath'

    bookMds.forEach(() => {
      mocks.extract.mockRejectedValue(extractError)
    })

    const bookMdsExtracted = await extractBooksOnDisk(bookSlugs, dir)

    expect(mocks.logError).toHaveBeenCalledTimes(1)
    expect(mocks.logError).toHaveBeenCalledWith('[md-extract]', extractError)
    expect(bookMdsExtracted).toEqual([])
  })
})
