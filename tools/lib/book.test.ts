import { Book } from '@app/prisma'
import { Dirent, existsSync, Stats } from 'fs'
import { copyFile, readdir, stat, unlink } from 'fs/promises'
import path from 'path'
import { mocked } from 'ts-jest/utils'
import sharp, { Metadata, Sharp } from 'sharp'
import * as bookLib from './book'
import * as fixtures from './book.fixtures'
import { findVolume } from './google-books'
import log from './log'
import { addFrontMatter, extract } from './md'
import { getCoverUrl, getWorkFromBook } from './open-library'
import { downloadTo } from './web'
import { omit } from 'lodash'

jest.mock('sharp')
jest.mock('fs')
jest.mock('fs/promises')
jest.mock('./web')
jest.mock('./open-library')
jest.mock('./google-books')
jest.mock('./log')
jest.mock('./md')

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
  sharp: mocked(sharp),
}

const spies = {
  processInput: jest.spyOn(bookLib, '_processInputs'),
  getCoverData: jest.spyOn(bookLib, '_getCoverData'),
}

describe('book', () => {
  afterEach(() => {
    const mockKeys = Object.keys(mocks) as (keyof typeof mocks)[]
    const spyKeys = Object.keys(spies) as (keyof typeof spies)[]

    mockKeys.forEach((key) => {
      mocks[key].mockReset()
    })

    spyKeys.forEach((key) => {
      spies[key].mockReset()
    })
  })

  test('getCoverPathforBook', () => {
    const bookMd = fixtures.makeBookMd()
    const coverPath = bookLib.getCoverPathForBook(bookMd)

    expect(coverPath).toBe(`${bookLib.bookCoverDir}/${path.basename(bookMd.filename, '.md')}.jpg`)
  })

  test('bookToString', async () => {
    const book = fixtures.makeBook()
    const randomBookString = 'a tale of two scripts'

    mocks.addFrontMatter.mockReturnValue(randomBookString)
    const bookString = await bookLib.bookToString(book)

    expect(bookString).toBe(randomBookString)
  })

  test('makeBookMd', async () => {
    const bookMd = fixtures.makeBookMd()
    const bookMd2 = bookLib.makeBookMd(bookMd.filename, bookMd.markdown, bookMd.frontmatter)

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

    expect(() => bookLib.makeBookMd(...args)).toThrow()
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

    const files = await bookLib.readBookDir(dir)

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

    const updated = await bookLib.filterRecentlyUpdatedBooks(bookSlugs, books, dir)

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

    const updated = await bookLib.filterRecentlyUpdatedBooks(bookSlugs, books, dir)

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

    const bookMdsExtracted = await bookLib.extractBooksOnDisk(bookSlugs, dir)

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

    const bookMdsExtracted = await bookLib.extractBooksOnDisk(bookSlugs, dir)

    expect(mocks.logError).toHaveBeenCalledTimes(1)
    expect(mocks.logError).toHaveBeenCalledWith('[md-extract]', extractError)
    expect(bookMdsExtracted).toEqual([])
  })

  test('bookMdToCreateInput', async () => {
    const bookMd = fixtures.makeBookMd()
    const dir = 'dirPath'

    spies.processInput.mockResolvedValue(bookMd)

    const bookCreateInput = await bookLib.bookMdToBookCreateInput(bookMd, dir)

    expect(spies.processInput).toHaveBeenCalledWith(bookMd, dir)
    expect(bookCreateInput).toEqual({
      ...bookMd.frontmatter,
      slug: path.basename(bookMd.filename, '.md'),
      note: bookMd.markdown,
    })
  })

  test('bookMdToCreateInput downloads cover', async () => {
    const cover = 'somewhere'
    const coverData = { cover_path: 'somewhere-else', width: 10, height: 20 }
    const bookMd = fixtures.makeBookMd({
      frontmatter: { __input: { cover } },
    })
    const dir = 'dirPath'

    spies.processInput.mockResolvedValue(bookMd)
    spies.getCoverData.mockResolvedValue(coverData)

    const bookCreateInput = await bookLib.bookMdToBookCreateInput(bookMd, dir)

    expect(spies.processInput).toHaveBeenCalledWith(bookMd, dir)
    expect(spies.getCoverData).toHaveBeenCalledWith(bookMd, dir)
    expect(bookCreateInput).toEqual({
      ...omit(bookMd.frontmatter, '__input'),
      slug: path.basename(bookMd.filename, '.md'),
      note: bookMd.markdown,
      ...coverData,
    })
  })
})

/*
      mocks.sharp.mockImplementation(
      () =>
        ({
          metadata: async () =>
            ({
              width: 10,
              height: 15,
            } as Metadata),
        } as Sharp)
    )
    */
