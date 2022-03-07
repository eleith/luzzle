import { Book } from '@app/prisma'
import { Dirent, Stats } from 'fs'
import { copyFile, mkdir, readdir, readFile, stat, unlink, writeFile } from 'fs/promises'
import path from 'path'
import sharp, { Metadata, Sharp } from 'sharp'
import * as bookLib from './book'
import * as bookFixtures from './book.fixtures'
import * as openLibFixtures from './open-library.fixtures'
import * as googleBooksFixtures from './google-books.fixtures'
import { findVolume } from './google-books'
import log from './log'
import { addFrontMatter, extract } from './md'
import { findWork, getBook, getCoverUrl } from './open-library'
import { downloadTo } from './web'
import { FileTypeResult, fileTypeFromFile } from 'file-type'
import { describe, expect, test, vi, afterEach, beforeEach } from 'vitest'
import { CpuInfo, cpus } from 'os'

vi.mock('file-type')
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('sharp')
vi.mock('./web')
vi.mock('./open-library')
vi.mock('./google-books')
vi.mock('./log')
vi.mock('./md')
vi.mock('os')

const mocks = {
  cpus: vi.mocked(cpus),
  addFrontMatter: vi.mocked(addFrontMatter),
  readdir: vi.mocked(readdir),
  readdirString: vi.mocked(readdir as (path: string) => Promise<string[]>),
  extract: vi.mocked(extract),
  copyFile: vi.mocked(copyFile),
  unlink: vi.mocked(unlink),
  stat: vi.mocked(stat),
  downloadTo: vi.mocked(downloadTo),
  findVolume: vi.mocked(findVolume),
  getCoverUrl: vi.mocked(getCoverUrl),
  getBook: vi.mocked(getBook),
  findWork: vi.mocked(findWork),
  logError: vi.mocked(log.error),
  logWarn: vi.mocked(log.warn),
  sharp: vi.mocked(sharp),
  fromFile: vi.mocked(fileTypeFromFile),
  readFile: vi.mocked(readFile),
  writeFile: vi.mocked(writeFile),
  mkdir: vi.mocked(mkdir),
}

describe('book', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    Object.values(mocks).forEach((x) => {
      x.mockReset()
    })

    vi.resetAllMocks()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  test('bookMdToString', async () => {
    const book = bookFixtures.makeBookMd()
    const randomBookString = 'a tale of two scripts'

    mocks.addFrontMatter.mockReturnValue(randomBookString)
    const bookString = bookLib.bookMdToString(book)

    expect(bookString).toBe(randomBookString)
  })

  test('_makeBookMd', async () => {
    const bookMd = bookFixtures.makeBookMd()
    const bookMd2 = bookLib._private._makeBookMd(
      bookMd.filename,
      bookMd.markdown,
      bookMd.frontmatter
    )

    expect(bookMd2).toEqual(bookMd)
  })

  test('_makeBookMd throws on invalidation', async () => {
    const bookMdSimple = bookFixtures.makeBookMd()
    const bookMd = {
      filename: bookMdSimple.filename,
      markdown: bookMdSimple.markdown,
      frontmatter: {
        ...bookMdSimple.frontmatter,
        badField: 'badData',
      },
    }

    const args = [bookMd.filename, bookMd.markdown, bookMd.frontmatter] as const

    expect(() => bookLib._private._makeBookMd(...args)).toThrow()
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

    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    mocks.stat.mockResolvedValue({ mtime: updatedDate } as Stats)

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

    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    mocks.stat.mockResolvedValue({ mtime: updatedDate } as Stats)

    const updated = await bookLib.filterRecentlyUpdatedBooks(bookSlugs, books, dir)

    expect(mocks.stat).toHaveBeenCalledTimes(3)
    expect(updated).toEqual(['four'])
  })

  test('getBook', async () => {
    const bookMd = bookFixtures.makeBookMd()
    const bookSlugs = path.basename(bookMd.filename, '.md')
    const dir = 'dirPath'

    mocks.extract.mockResolvedValueOnce(bookMd as Awaited<ReturnType<typeof mocks.extract>>)

    const bookMdExtracted = await bookLib.getBook(bookSlugs, dir)

    expect(bookMdExtracted).toEqual(bookMd)
  })

  test('getBook returns null on error', async () => {
    const bookMd = bookFixtures.makeBookMd()
    const bookSlugs = path.basename(bookMd.filename, '.md')
    const dir = 'dirPath'

    mocks.extract.mockRejectedValueOnce(new Error('boom'))

    const bookMdExtracted = await bookLib.getBook(bookSlugs, dir)

    expect(bookMdExtracted).toBeNull()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })

  test('bookMdToCreateInput', async () => {
    const bookMd = bookFixtures.makeBookMd()
    const dir = 'dirPath'
    const spyMaybeGetCoverData = vi.spyOn(bookLib._private, '_maybeGetCoverData')
    const bookInput = bookFixtures.makeBookCreateInput()

    spyMaybeGetCoverData.mockResolvedValueOnce(bookInput)

    const bookCreateInput = await bookLib.bookMdToBookCreateInput(bookMd, dir)

    expect(spyMaybeGetCoverData).toHaveBeenCalledOnce()
    expect(bookCreateInput).toEqual(bookInput)
  })

  test('bookMdToUpdateInput', async () => {
    const title = 'a new title'
    const bookMd = bookFixtures.makeBookMd()
    const book = bookFixtures.makeBook({
      title: bookMd.frontmatter.title,
      author: bookMd.frontmatter.author,
      note: bookMd.markdown,
      slug: path.basename(bookMd.filename, '.md'),
    })
    const dir = 'dirPath'
    const spyMaybeGetCoverData = vi.spyOn(bookLib._private, '_maybeGetCoverData')
    const bookInput = bookFixtures.makeBookUpdateInput(book)

    spyMaybeGetCoverData.mockResolvedValueOnce(bookInput)
    bookMd.frontmatter.title = title

    const bookUpdateInput = await bookLib.bookMdToBookUpdateInput(bookMd, book, dir)

    expect(spyMaybeGetCoverData).toHaveBeenCalledWith(bookMd, { title }, dir)
    expect(bookUpdateInput).toEqual(bookInput)
  })

  test('_getCoverData', async () => {
    const width = 10
    const height = 15
    const dir = 'path/to'
    const coverPathRelative = 'an/image.jpg'
    const coverPath = `path/to/${coverPathRelative}`

    mocks.sharp.mockImplementation(
      () =>
        ({
          metadata: async () =>
            ({
              width,
              height,
            } as Metadata),
        } as Sharp)
    )

    const coverData = await bookLib._private._getCoverData(coverPath, dir)

    expect(mocks.sharp).toHaveBeenCalledWith(coverPath)
    expect(coverData).toEqual({
      cover_path: coverPathRelative,
      cover_width: width,
      cover_height: height,
    })
  })

  test('_downloadCover with url', async () => {
    const cover = 'https://somewhere'
    const temp = 'somewhere/else/cover.jpg'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover } } })
    const coverPath = 'path/to/image.jpg'

    mocks.downloadTo.mockResolvedValueOnce(temp)
    mocks.fromFile.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)

    const succeed = await bookLib._private._downloadCover(
      bookMd as bookLib.BookMdWithCover,
      coverPath
    )

    expect(mocks.downloadTo).toHaveBeenCalledWith(cover)
    expect(mocks.copyFile).toHaveBeenCalledWith(temp, coverPath)
    expect(mocks.unlink).toHaveBeenCalledWith(temp)
    expect(succeed).toBe(true)
  })

  test('_downloadCover with url rejects .png', async () => {
    const cover = 'https://somewhere'
    const temp = 'somewhere/else/cover.png'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover } } })
    const coverPath = 'path/to/image.jpg'

    mocks.downloadTo.mockResolvedValueOnce(temp)
    mocks.fromFile.mockResolvedValueOnce({ ext: 'png' } as FileTypeResult)

    const success = await bookLib._private._downloadCover(
      bookMd as bookLib.BookMdWithCover,
      coverPath
    )

    expect(success).toBe(false)
    expect(mocks.downloadTo).toHaveBeenCalledWith(cover)
    expect(mocks.copyFile).not.toHaveBeenCalled()
    expect(mocks.unlink).toHaveBeenCalledWith(temp)
  })

  test('_downloadCover with file', async () => {
    const cover = '../somewhere/here/cover.jpg'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover } } })
    const coverPath = 'path/to/image.jpg'

    mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)
    mocks.fromFile.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)

    const success = await bookLib._private._downloadCover(
      bookMd as bookLib.BookMdWithCover,
      coverPath
    )

    expect(success).toBe(true)
    expect(mocks.stat).toHaveBeenCalledWith(cover)
    expect(mocks.fromFile).toHaveBeenCalledWith(cover)
    expect(mocks.copyFile).toHaveBeenCalledWith(cover, coverPath)
  })

  test('_downloadCover with file rejects .png', async () => {
    const cover = '../somewhere/here/cover.png'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover } } })
    const coverPath = 'path/to/image.jpg'

    mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)
    mocks.fromFile.mockResolvedValueOnce({ ext: 'png' } as FileTypeResult)

    const success = await bookLib._private._downloadCover(
      bookMd as bookLib.BookMdWithCover,
      coverPath
    )

    expect(success).toBe(false)
    expect(mocks.stat).toHaveBeenCalledWith(cover)
    expect(mocks.fromFile).toHaveBeenCalledWith(cover)
    expect(mocks.copyFile).not.toHaveBeenCalled()
  })

  test('_downloadCover rejects non existant file', async () => {
    const cover = '../somewhere/here/cover.png'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover } } })
    const coverPath = '/path/to/cover.jpg'

    mocks.stat.mockResolvedValueOnce({ isFile: () => false } as Stats)

    const success = await bookLib._private._downloadCover(
      bookMd as bookLib.BookMdWithCover,
      coverPath
    )

    expect(success).toBe(false)
    expect(mocks.stat).toHaveBeenCalledWith(cover)
    expect(mocks.fromFile).not.toHaveBeenCalled()
    expect(mocks.copyFile).not.toHaveBeenCalled()
  })

  test('_maybeDownloadCover', async () => {
    const cover = 'somewhere/here/cover.png'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover } } })
    const dir = 'dirPath'
    const spyDownloadCover = vi.spyOn(bookLib._private, '_downloadCover')
    const spyUpdateCache = vi.spyOn(bookLib._private, '_updateCache')

    spyDownloadCover.mockResolvedValueOnce(true)
    spyUpdateCache.mockResolvedValueOnce()

    const bookMdOutput = await bookLib._private._maybeDownloadCover(bookMd, dir)

    expect(spyDownloadCover).toHaveBeenCalled()
    expect(spyUpdateCache).toHaveBeenCalled()
    expect(bookMdOutput).toEqual(bookMd)
  })

  test('_maybeDownloadCover skips cache', async () => {
    const cover = 'somewhere/here/cover.png'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover } } })
    const dir = 'dirPath'
    const spyDownloadCover = vi.spyOn(bookLib._private, '_downloadCover')
    const spyUpdateCache = vi.spyOn(bookLib._private, '_updateCache')

    spyDownloadCover.mockResolvedValueOnce(false)
    spyUpdateCache.mockResolvedValueOnce()

    const bookMdOutput = await bookLib._private._maybeDownloadCover(bookMd, dir)

    expect(spyDownloadCover).toHaveBeenCalled()
    expect(spyUpdateCache).not.toHaveBeenCalled()
    expect(bookMdOutput).toEqual(bookMd)
  })

  test('_maybeSearch', async () => {
    const search = 'open-library'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { search } } })
    const bookMdAfter = bookFixtures.makeBookMd()
    const spyProcessSearch = vi.spyOn(bookLib._private, '_search')

    spyProcessSearch.mockResolvedValueOnce(bookMdAfter)

    const bookMdProcessed = await bookLib._private._maybeSearch(bookMd as bookLib.BookMdWithSearch)

    expect(bookMdProcessed).toEqual(bookMdAfter)
    expect(spyProcessSearch).toHaveBeenCalledWith(bookMd)
  })

  test('_maybeSearch skips', async () => {
    const bookMd = bookFixtures.makeBookMd()
    const bookMdAfter = bookFixtures.makeBookMd()
    const spyProcessSearch = vi.spyOn(bookLib._private, '_search')

    const bookMdProcessed = await bookLib._private._maybeSearch(bookMd as bookLib.BookMdWithSearch)

    expect(bookMdProcessed).toEqual(bookMdAfter)
    expect(spyProcessSearch).not.toHaveBeenCalled()
  })

  test('_search open all', async () => {
    const search = 'all'
    const openLibraryResult = { title: 'a new title' }
    const googleBooksResult = { author: 'a new author' }
    const bookMd = bookFixtures.makeBookMd({
      frontmatter: { id_ol_book: 'xyz', __input: { search } },
    })
    const bookMdSearch = bookFixtures.makeBookMd({
      ...bookMd,
      ...{ frontmatter: { ...openLibraryResult, ...googleBooksResult, ...bookMd.frontmatter } },
    })
    const spySearchGoogleBooks = vi.spyOn(bookLib._private, '_searchGoogleBooks')
    const spySearchOpenLibrary = vi.spyOn(bookLib._private, '_searchOpenLibrary')

    spySearchGoogleBooks.mockResolvedValueOnce(googleBooksResult as bookLib.BookMd['frontmatter'])
    spySearchOpenLibrary.mockResolvedValueOnce(openLibraryResult as bookLib.BookMd['frontmatter'])

    const bookMdAfter = await bookLib._private._search(bookMd as bookLib.BookMdWithSearch)

    expect(bookMdAfter).toEqual(bookMdSearch)
    expect(spySearchGoogleBooks).toHaveBeenCalledWith(
      bookMd.frontmatter.title,
      bookMd.frontmatter.author
    )
    expect(spySearchOpenLibrary).toHaveBeenCalledWith(bookMd)
  })

  test('_search open library', async () => {
    const search = 'open-library'
    const openLibraryResult = { title: 'a new title' }
    const bookMd = bookFixtures.makeBookMd({
      frontmatter: { id_ol_book: 'xyz', __input: { search } },
    })
    const bookMdSearch = bookFixtures.makeBookMd({
      ...bookMd,
      ...{ frontmatter: { ...openLibraryResult, ...bookMd.frontmatter } },
    })
    const spySearchGoogleBooks = vi.spyOn(bookLib._private, '_searchGoogleBooks')
    const spySearchOpenLibrary = vi.spyOn(bookLib._private, '_searchOpenLibrary')

    spySearchOpenLibrary.mockResolvedValueOnce(openLibraryResult as bookLib.BookMd['frontmatter'])

    const bookMdAfter = await bookLib._private._search(bookMd as bookLib.BookMdWithSearch)

    expect(bookMdAfter).toEqual(bookMdSearch)
    expect(spySearchGoogleBooks).not.toHaveBeenCalledWith()
    expect(spySearchOpenLibrary).toHaveBeenCalledWith(bookMd)
  })

  test('_search google', async () => {
    const search = 'google'
    const googleBooksResult = { author: 'a new author' }
    const bookMd = bookFixtures.makeBookMd({
      frontmatter: { __input: { search } },
    })
    const bookMdSearch = bookFixtures.makeBookMd({
      ...bookMd,
      ...{ frontmatter: { ...googleBooksResult, ...bookMd.frontmatter } },
    })
    const spySearchGoogleBooks = vi.spyOn(bookLib._private, '_searchGoogleBooks')
    const spySearchOpenLibrary = vi.spyOn(bookLib._private, '_searchOpenLibrary')

    spySearchGoogleBooks.mockResolvedValueOnce(googleBooksResult as bookLib.BookMd['frontmatter'])

    const bookMdAfter = await bookLib._private._search(bookMd as bookLib.BookMdWithSearch)

    expect(bookMdAfter).toEqual(bookMdSearch)
    expect(spySearchGoogleBooks).toHaveBeenCalledWith(
      bookMd.frontmatter.title,
      bookMd.frontmatter.author
    )
    expect(spySearchOpenLibrary).not.toHaveBeenCalled()
  })

  test('_searchOpenLibrary', async () => {
    const workId = 'work-id'
    const bookId = 'book-id'
    const book = openLibFixtures.makeOpenLibraryBook({ works: [{ key: `/works/${workId}` }] })
    const work = openLibFixtures.makeOpenLibrarySearchWork()
    const coverUrl = 'https://somewhere'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { id_ol_book: bookId } })

    mocks.getBook.mockResolvedValueOnce(book)
    mocks.findWork.mockResolvedValueOnce(work)
    mocks.getCoverUrl.mockReturnValue(coverUrl)

    const bookMetadata = await bookLib._private._searchOpenLibrary(
      bookMd as bookLib.BookMdWithOpenLib
    )

    expect(mocks.getBook).toHaveBeenCalledWith(bookId)
    expect(mocks.findWork).toHaveBeenCalledWith(workId)
    expect(mocks.getCoverUrl).toHaveBeenCalledWith(work.cover_i)
    expect(bookMetadata).toEqual({
      title: bookMd.frontmatter.title,
      author: bookMd.frontmatter.author,
      subtitle: book.subtitle,
      id_ol_work: workId,
      year_first_published: work.first_publish_year,
      __input: {
        cover: coverUrl,
      },
    })
  })

  test('_searchOpenLibrary all metadata', async () => {
    const workId = 'work-id'
    const bookId = 'book-id'
    const book = openLibFixtures.makeOpenLibraryBook({
      works: [{ key: `/works/${workId}` }],
    })
    const work = openLibFixtures.makeOpenLibrarySearchWork({
      isbn: ['isbn-13'],
      author_name: ['author-1', 'co-author'],
      number_of_pages: '423',
      subject: ['sci-fi'],
      place: ['xylo'],
      first_publish_year: 2016,
      title: 'book title',
    })
    const coverUrl = 'https://somewhere'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { id_ol_book: bookId } })

    mocks.getBook.mockResolvedValueOnce(book)
    mocks.findWork.mockResolvedValueOnce(work)
    mocks.getCoverUrl.mockReturnValue(coverUrl)

    const bookMetadata = await bookLib._private._searchOpenLibrary(
      bookMd as bookLib.BookMdWithOpenLib
    )

    expect(mocks.getBook).toHaveBeenCalledWith(bookId)
    expect(mocks.findWork).toHaveBeenCalledWith(workId)
    expect(bookMetadata).toEqual({
      title: work.title,
      author: work.author_name[0],
      coauthors: work.author_name[1],
      id_ol_work: workId,
      isbn: work.isbn?.[0],
      subtitle: book.subtitle,
      pages: Number(work.number_of_pages),
      keywords: [...work.subject, ...(work.place || [])].join(','),
      year_first_published: work.first_publish_year,
      __input: {
        cover: coverUrl,
      },
    })
  })

  test('_searchOpenLibrary returns null', async () => {
    const bookId = 'book-id'
    const work = openLibFixtures.makeOpenLibrarySearchWork()
    const coverUrl = 'https://somewhere'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { id_ol_book: bookId } })

    mocks.getBook.mockResolvedValueOnce(null)
    mocks.findWork.mockResolvedValueOnce(work)
    mocks.getCoverUrl.mockReturnValue(coverUrl)

    const bookMetadata = await bookLib._private._searchOpenLibrary(
      bookMd as bookLib.BookMdWithOpenLib
    )

    expect(mocks.getBook).toHaveBeenCalledWith(bookId)
    expect(mocks.findWork).not.toHaveBeenCalled()
    expect(bookMetadata).toBeNull()
  })

  test('_searchGooogleBooks', async () => {
    const title = 'a book title'
    const author = 'a book author'
    const volume = googleBooksFixtures.makeVolume()

    mocks.findVolume.mockResolvedValueOnce(volume)

    const bookMetadata = await bookLib._private._searchGoogleBooks(title, author)

    expect(mocks.findVolume).toHaveBeenCalledWith(title, author)
    expect(bookMetadata).toEqual({
      title,
      author,
    })
  })

  test('_searchGooogleBooks all metadata', async () => {
    const title = 'a book title'
    const author = 'a book author'
    const subtitle = 'a book subtitle'
    const authors = ['one author', 'co author']
    const pageCount = 423
    const categories = ['sci-fi']
    const description = 'intriguing'
    const volume = googleBooksFixtures.makeVolume({
      title,
      authors,
      subtitle,
      pageCount,
      categories,
      description,
    })

    mocks.findVolume.mockResolvedValueOnce(volume)

    const bookMetadata = await bookLib._private._searchGoogleBooks(title, author)

    expect(mocks.findVolume).toHaveBeenCalledWith(title, author)
    expect(bookMetadata).toEqual({
      title,
      author: authors[0],
      description,
      subtitle,
      coauthors: authors[1],
      pages: pageCount,
      keywords: categories.join(','),
    })
  })

  test('_searchGooogleBooks returns null', async () => {
    const title = 'a book title'
    const author = 'a book author'

    mocks.findVolume.mockResolvedValueOnce(null)

    const bookMetadata = await bookLib._private._searchGoogleBooks(title, author)

    expect(mocks.findVolume).toHaveBeenCalledWith(title, author)
    expect(bookMetadata).toBeNull()
  })

  test('getUpdatedSlugs', async () => {
    const slugs: string[] = ['a', 'b', 'c']
    const dir = 'path/to/books'
    const lastModified = new Date('2101-11-11')
    const updated = new Date('2201-11-11')
    const cache = bookFixtures.makeBookCache({ lastModified: lastModified.toJSON() })
    const spyGetCache = vi.spyOn(bookLib._private, '_getBookCache')

    mocks.cpus.mockReturnValue([{} as CpuInfo])
    mocks.stat.mockResolvedValueOnce({ mtime: lastModified } as Stats)
    mocks.stat.mockResolvedValue({ mtime: updated } as Stats)
    spyGetCache.mockResolvedValue(cache)

    const updatedSlugs = await bookLib.getUpdatedSlugs(slugs, dir)

    expect(updatedSlugs).toHaveLength(2)
  })

  test('getUpdatedSlugs skips on file failure', async () => {
    const slugs: string[] = ['a']
    const dir = 'path/to/books'
    const lastModified = new Date('2101-11-11')
    const cache = bookFixtures.makeBookCache({ lastModified: lastModified.toJSON() })
    const spyGetCache = vi.spyOn(bookLib._private, '_getBookCache')

    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    mocks.stat.mockRejectedValueOnce(new Error('boom'))
    spyGetCache.mockResolvedValue(cache)

    const updatedSlugs = await bookLib.getUpdatedSlugs(slugs, dir)

    expect(updatedSlugs).toEqual([])
  })

  test('cleanUpDerivates', async () => {
    const bookFiles = ['a.md']
    const cacheFiles = ['a.json', 'b.json']
    const cache = bookFixtures.makeBookCache()
    const spyGetCache = vi.spyOn(bookLib._private, '_getBookCache')
    const dir = 'path/to/books'

    mocks.readdirString.mockResolvedValueOnce(bookFiles)
    mocks.readdirString.mockResolvedValueOnce(cacheFiles)
    mocks.unlink.mockResolvedValue()
    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    spyGetCache.mockResolvedValue(cache)

    await bookLib.cleanUpDerivatives(dir)

    expect(mocks.unlink).toHaveBeenCalledTimes(bookFiles.length)
  })

  test('cleanUpDerivates removes cache and cover', async () => {
    const bookFiles = ['a.md']
    const cacheFiles = ['a.json', 'b.json']
    const cache = bookFixtures.makeBookCache({ hasCover: true })
    const spyGetCache = vi.spyOn(bookLib._private, '_getBookCache')
    const dir = 'path/to/books'

    mocks.readdirString.mockResolvedValueOnce(bookFiles)
    mocks.readdirString.mockResolvedValueOnce(cacheFiles)
    mocks.unlink.mockResolvedValue()
    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    spyGetCache.mockResolvedValue(cache)

    await bookLib.cleanUpDerivatives(dir)

    expect(mocks.unlink).toHaveBeenCalledTimes(bookFiles.length * 2)
  })

  test('cleanUpDerivates catches error', async () => {
    const dir = 'path/to/books'

    mocks.readdirString.mockRejectedValueOnce(new Error('boom'))

    await bookLib.cleanUpDerivatives(dir)

    expect(mocks.logError).toHaveBeenCalledOnce()
  })

  test('_maybeGetCoverData', async () => {
    const bookMd = bookFixtures.makeBookMd()
    const bookInput = bookFixtures.makeBookCreateInput()
    const dir = 'path/to/book'
    const cache = bookFixtures.makeBookCache({ hasCover: true })
    const coverData = { cover_path: 'xay' }
    const spyGetCache = vi.spyOn(bookLib._private, '_getBookCache')
    const spyGetCover = vi.spyOn(bookLib._private, '_getCoverData')

    spyGetCache.mockResolvedValueOnce(cache)
    spyGetCover.mockResolvedValueOnce(coverData)

    const data = await bookLib._private._maybeGetCoverData(bookMd, bookInput, dir)

    expect(spyGetCover).toHaveBeenCalledOnce()
    expect(data).toEqual({ ...bookInput, ...coverData })
  })

  test('_maybeGetCoverData returns no cover', async () => {
    const bookMd = bookFixtures.makeBookMd()
    const bookInput = bookFixtures.makeBookCreateInput()
    const dir = 'path/to/book'
    const cache = bookFixtures.makeBookCache()
    const spyGetCache = vi.spyOn(bookLib._private, '_getBookCache')

    spyGetCache.mockResolvedValueOnce(cache)

    const data = await bookLib._private._maybeGetCoverData(bookMd, bookInput, dir)

    expect(data).toEqual(bookInput)
  })

  test('updateBookMd', async () => {
    const bookMd = bookFixtures.makeBookMd()
    const dir = 'path/to/book'
    const spyUpdateCache = vi.spyOn(bookLib._private, '_updateCache')

    mocks.writeFile.mockResolvedValueOnce()
    mocks.stat.mockResolvedValueOnce({ mtime: new Date() } as Stats)
    spyUpdateCache.mockResolvedValueOnce()

    await bookLib.updateBookMd(bookMd, dir)

    expect(mocks.writeFile).toHaveBeenCalledOnce()
    expect(spyUpdateCache).toHaveBeenCalledOnce()
  })

  test('updateBookMd skips cache', async () => {
    const bookMd = bookFixtures.makeBookMd()
    const dir = 'path/to/book'
    const spyUpdateCache = vi.spyOn(bookLib._private, '_updateCache')

    mocks.writeFile.mockResolvedValueOnce()
    mocks.stat.mockRejectedValueOnce(new Error('boom'))

    await bookLib.updateBookMd(bookMd, dir)

    expect(mocks.writeFile).toHaveBeenCalledOnce()
    expect(spyUpdateCache).not.toHaveBeenCalled()
  })

  test('processBookMd', async () => {
    const bookMd = bookFixtures.makeBookMd()
    const dir = 'path/to/book'
    const spySearch = vi.spyOn(bookLib._private, '_maybeSearch')
    const spyDownload = vi.spyOn(bookLib._private, '_maybeDownloadCover')

    spySearch.mockResolvedValueOnce(bookMd)
    spyDownload.mockResolvedValueOnce(bookMd)

    const updatedBook = await bookLib.processBookMd(bookMd, dir)

    expect(bookMd).toEqual(updatedBook)
    expect(spySearch).toHaveBeenCalledOnce()
    expect(spyDownload).toHaveBeenCalledOnce()
  })

  test('cacheBook', async () => {
    const databaseCache = {
      slug: 'a',
      cover_path: 'b',
      date_updated: new Date(),
      date_added: new Date(),
      id: 'x',
    }
    const book = bookFixtures.makeBook(databaseCache)
    const dir = 'path/to/book'
    const spyUpdate = vi.spyOn(bookLib._private, '_updateCache')

    spyUpdate.mockResolvedValueOnce()

    await bookLib.cacheBook(book, dir)

    expect(spyUpdate).toHaveBeenCalledWith(dir, book.slug, {
      database: databaseCache,
    })
  })

  test('bookToMd', async () => {
    const book = bookFixtures.makeBook()
    const spyMake = vi.spyOn(bookLib._private, '_makeBookMd')

    await bookLib.bookToMd(book)

    expect(spyMake).toHaveBeenCalled()
  })

  test('getBookCache', async () => {
    const cacheMake = bookFixtures.makeBookCache()
    const dir = 'path/to/book'
    const slug = 'a'

    mocks.readFile.mockResolvedValueOnce(JSON.stringify(cacheMake))

    const cache = await bookLib.getBookCache(dir, slug)

    expect(mocks.stat).not.toHaveBeenCalled()
    expect(cache).toEqual(cacheMake)
  })

  test('getBookCache makes default cache', async () => {
    const dir = 'path/to/book'
    const slug = 'a'
    const mtime = new Date()

    mocks.readFile.mockRejectedValueOnce(new Error('boom'))
    mocks.stat.mockResolvedValue({ mtime } as Stats)

    const cache = await bookLib.getBookCache(dir, slug)

    expect(mocks.stat).toHaveBeenCalledTimes(2)
    expect(cache).toEqual({ lastModified: mtime.toJSON(), hasCover: true })
    expect(mocks.logWarn).toHaveBeenCalledOnce()
  })

  test('getBookCache handles invalid cache', async () => {
    const dir = 'path/to/book'
    const slug = 'a'
    const mtime = new Date(2202, 2, 2)

    mocks.readFile.mockResolvedValueOnce(JSON.stringify({ invalid: 'cache' }))
    mocks.stat.mockResolvedValue({ mtime } as Stats)

    const cache = await bookLib.getBookCache(dir, slug)

    expect(mocks.stat).toHaveBeenCalledTimes(2)
    expect(cache).toEqual({ lastModified: mtime.toJSON(), hasCover: true })
  })

  test('getBookCache handles invalid stat calls', async () => {
    const dir = 'path/to/book'
    const slug = 'a'
    const mtime = new Date(2201, 1, 1)

    vi.setSystemTime(mtime)
    mocks.readFile.mockResolvedValueOnce(JSON.stringify({ invalid: 'cache' }))
    mocks.stat.mockRejectedValue(new Error('boom'))

    const cache = await bookLib.getBookCache(dir, slug)

    expect(cache).toEqual({ lastModified: mtime.toJSON(), hasCover: false })
  })

  test('_updateCache', async () => {
    const dir = 'path/to/book'
    const slug = 'a'
    const cache = bookFixtures.makeBookCache()
    const cacheUpdate = bookFixtures.makeBookCache()
    const spyGetCache = vi.spyOn(bookLib._private, '_getBookCache')

    mocks.writeFile.mockResolvedValueOnce()
    mocks.mkdir.mockResolvedValueOnce('')
    spyGetCache.mockResolvedValueOnce(cache)

    await bookLib._private._updateCache(dir, slug, cacheUpdate)

    expect(spyGetCache).toHaveBeenCalledOnce()
    expect(mocks.mkdir).toHaveBeenCalledOnce()
    expect(mocks.writeFile).toHaveBeenCalledOnce()
  })
})
