import { Book } from '@app/prisma'
import { Dirent, Stats } from 'fs'
import { copyFile, readdir, stat, unlink } from 'fs/promises'
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
import { omit } from 'lodash'
import { FileTypeResult, fileTypeFromFile } from 'file-type'
import { describe, expect, test, vi, afterEach } from 'vitest'

vi.mock('file-type')
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('sharp')
vi.mock('./web')
vi.mock('./open-library')
vi.mock('./google-books')
vi.mock('./log')
vi.mock('./md')

const mocks = {
  addFrontMatter: vi.mocked(addFrontMatter),
  readdir: vi.mocked(readdir),
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
  sharp: vi.mocked(sharp),
  fromFile: vi.mocked(fileTypeFromFile),
}

describe('book', () => {
  afterEach(() => {
    Object.values(mocks).forEach((x) => {
      x.mockReset()
      x.mockClear()
    })
  })

  test('getCoverPathforBook', () => {
    const bookMd = bookFixtures.makeBookMd()
    const coverPath = bookLib.getCoverPathForBook(bookMd)

    expect(coverPath).toBe(`${bookLib.bookCoverDir}/${path.basename(bookMd.filename, '.md')}.jpg`)
  })

  test('bookToString', async () => {
    const book = bookFixtures.makeBook()
    const randomBookString = 'a tale of two scripts'

    mocks.addFrontMatter.mockReturnValue(randomBookString)
    const bookString = await bookLib.bookToString(book)

    expect(bookString).toBe(randomBookString)
  })

  test('makeBookMd', async () => {
    const bookMd = bookFixtures.makeBookMd()
    const bookMd2 = bookLib.makeBookMd(bookMd.filename, bookMd.markdown, bookMd.frontmatter)

    expect(bookMd2).toEqual(bookMd)
  })

  test('makeBookMd throws on invalidation', async () => {
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
    const bookMds = [bookFixtures.makeBookMd(), bookFixtures.makeBookMd()]
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
    const bookMds = [bookFixtures.makeBookMd()]
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
    const bookMd = bookFixtures.makeBookMd()
    const dir = 'dirPath'
    const spyProcessInputs = vi.spyOn(bookLib._private, '_processInputs')

    spyProcessInputs.mockResolvedValueOnce(bookMd)

    const bookCreateInput = await bookLib.bookMdToBookCreateInput(bookMd, dir)

    expect(spyProcessInputs).toHaveBeenCalledWith(bookMd, dir)
    expect(bookCreateInput).toEqual({
      ...bookMd.frontmatter,
      slug: path.basename(bookMd.filename, '.md'),
      note: bookMd.markdown,
    })
  })

  test('bookMdToCreateInput downloads cover', async () => {
    const cover = 'somewhere'
    const coverData = { cover_path: 'somewhere-else', width: 10, height: 20 }
    const bookMd = bookFixtures.makeBookMd({
      frontmatter: { __input: { cover } },
    })
    const dir = 'dirPath'
    const spyProcessInputs = vi.spyOn(bookLib._private, '_processInputs')
    const spyGetCoverData = vi.spyOn(bookLib._private, '_getCoverData')

    spyProcessInputs.mockResolvedValueOnce(bookMd)
    spyGetCoverData.mockResolvedValueOnce(coverData)

    const bookCreateInput = await bookLib.bookMdToBookCreateInput(bookMd, dir)

    expect(spyProcessInputs).toHaveBeenCalledWith(bookMd, dir)
    expect(spyGetCoverData).toHaveBeenCalledWith(bookMd, dir)
    expect(bookCreateInput).toEqual({
      ...omit(bookMd.frontmatter, '__input'),
      slug: path.basename(bookMd.filename, '.md'),
      note: bookMd.markdown,
      ...coverData,
    })
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
    const spyProcessInputs = vi.spyOn(bookLib._private, '_processInputs')

    spyProcessInputs.mockResolvedValueOnce(bookMd)
    bookMd.frontmatter.title = title

    const bookCreateInput = await bookLib.bookMdToBookUpdateInput(bookMd, book, dir)

    expect(spyProcessInputs).toHaveBeenCalledWith(bookMd, dir)
    expect(bookCreateInput).toEqual({ title })
  })

  test('bookMdToUpdateInput downloads cover', async () => {
    const cover = 'somewhere'
    const coverData = { cover_path: 'somewhere-else', width: 10, height: 20 }
    const bookMd = bookFixtures.makeBookMd({
      frontmatter: { __input: { cover } },
    })
    const book = bookFixtures.makeBook({
      title: bookMd.frontmatter.title,
      author: bookMd.frontmatter.author,
      note: bookMd.markdown,
      slug: path.basename(bookMd.filename, '.md'),
    })
    const dir = 'dirPath'
    const spyProcessInputs = vi.spyOn(bookLib._private, '_processInputs')
    const spyGetCoverData = vi.spyOn(bookLib._private, '_getCoverData')

    spyProcessInputs.mockResolvedValueOnce(bookMd)
    spyGetCoverData.mockResolvedValueOnce(coverData)

    const bookCreateInput = await bookLib.bookMdToBookUpdateInput(bookMd, book, dir)

    expect(spyProcessInputs).toHaveBeenCalledWith(bookMd, dir)
    expect(spyGetCoverData).toHaveBeenCalledWith(bookMd, dir)
    expect(bookCreateInput).toEqual({
      ...coverData,
    })
  })

  test('findNonExistantBook', () => {
    const disk = ['one', 'three']
    const missing = { id: '2', slug: 'two' }
    const db = [{ id: '1', slug: 'one' }, missing, { id: '3', slug: 'three' }]

    const diff = bookLib.findNonExistantBooks(disk, db)

    expect(diff).toEqual([missing])
  })

  test('_getCoverData', async () => {
    const bookMd = bookFixtures.makeBookMd()
    const path = bookLib.getCoverPathForBook(bookMd)
    const width = 10
    const height = 15
    const dir = 'dirPath'

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

    const coverData = await bookLib._private._getCoverData(bookMd, dir)

    expect(mocks.sharp).toHaveBeenCalledWith(`${dir}/${path}`)
    expect(coverData).toEqual({
      cover_path: path,
      cover_width: width,
      cover_height: height,
    })
  })

  test('_downloadCover with url', async () => {
    const cover = 'https://somewhere'
    const temp = 'somewhere/else/cover.jpg'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover } } })
    const dir = 'dirPath'
    const dest = `${dir}/${bookLib.getCoverPathForBook(bookMd)}`

    mocks.downloadTo.mockResolvedValueOnce(temp)

    await bookLib._private._downloadCover(bookMd as bookLib.BookMdWithCover, dir)

    expect(mocks.downloadTo).toHaveBeenCalledWith(cover)
    expect(mocks.copyFile).toHaveBeenCalledWith(temp, dest)
    expect(mocks.unlink).toHaveBeenCalledWith(temp)
  })

  test('_downloadCover with url rejects .png', async () => {
    const cover = 'https://somewhere'
    const temp = 'somewhere/else/cover.png'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover } } })
    const dir = 'dirPath'

    mocks.downloadTo.mockResolvedValueOnce(temp)
    const downloadCover = bookLib._private._downloadCover(bookMd as bookLib.BookMdWithCover, dir)

    await expect(downloadCover).rejects.toThrow()
    expect(mocks.downloadTo).toHaveBeenCalledWith(cover)
    expect(mocks.copyFile).not.toHaveBeenCalled()
    expect(mocks.unlink).toHaveBeenCalledWith(temp)
  })

  test('_downloadCover with file', async () => {
    const cover = '../somewhere/here/cover.jpg'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover } } })
    const dir = 'dirPath'
    const coverPath = path.join(dir, cover)
    const dest = `${dir}/${bookLib.getCoverPathForBook(bookMd)}`

    mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)
    mocks.fromFile.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)

    await bookLib._private._downloadCover(bookMd as bookLib.BookMdWithCover, dir)

    expect(mocks.stat).toHaveBeenCalledWith(coverPath)
    expect(mocks.fromFile).toHaveBeenCalledWith(coverPath)
    expect(mocks.copyFile).toHaveBeenCalledWith(coverPath, dest)
  })

  test('_downloadCover with file rejects .png', async () => {
    const cover = '../somewhere/here/cover.png'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover } } })
    const dir = 'dirPath'
    const coverPath = path.join(dir, cover)

    mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)
    mocks.fromFile.mockResolvedValueOnce({ ext: 'png' } as FileTypeResult)

    const downloadCover = bookLib._private._downloadCover(bookMd as bookLib.BookMdWithCover, dir)

    await expect(downloadCover).rejects.toThrow()
    expect(mocks.stat).toHaveBeenCalledWith(coverPath)
    expect(mocks.fromFile).toHaveBeenCalledWith(coverPath)
    expect(mocks.copyFile).not.toHaveBeenCalled()
  })

  test('_downloadCover rejects non existant file', async () => {
    const cover = '../somewhere/here/cover.png'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover } } })
    const dir = 'dirPath'
    const coverPath = path.join(dir, cover)

    mocks.stat.mockResolvedValueOnce({ isFile: () => false } as Stats)

    const downloadCover = bookLib._private._downloadCover(bookMd as bookLib.BookMdWithCover, dir)

    await expect(downloadCover).rejects.toThrow()
    expect(mocks.stat).toHaveBeenCalledWith(coverPath)
    expect(mocks.fromFile).not.toHaveBeenCalled()
    expect(mocks.copyFile).not.toHaveBeenCalled()
  })

  test('_downloadCover rejects file in output dir', async () => {
    const cover = 'somewhere/here/cover.png'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover } } })
    const dir = 'dirPath'

    const downloadCover = bookLib._private._downloadCover(bookMd as bookLib.BookMdWithCover, dir)

    await expect(downloadCover).rejects.toThrow()
    expect(mocks.downloadTo).not.toHaveBeenCalled()
  })

  test('_processInputs', async () => {
    const cover = 'somewhere/here/cover.png'
    const search = 'open-library'
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __input: { cover, search } } })
    const bookMdAfter = bookFixtures.makeBookMd()
    const dir = 'dirPath'
    const spyProcessSearch = vi.spyOn(bookLib._private, '_search')
    const spyDownloadCover = vi.spyOn(bookLib._private, '_downloadCover')

    spyProcessSearch.mockResolvedValueOnce(bookMdAfter)
    spyDownloadCover.mockResolvedValueOnce()

    const bookMdProcessed = await bookLib._private._processInputs(
      bookMd as bookLib.BookMdWithCover,
      dir
    )

    expect(bookMdProcessed).toEqual(bookMdAfter)
    expect(spyProcessSearch).toHaveBeenCalledWith(bookMd)
    expect(spyDownloadCover).toHaveBeenCalledWith(bookMd, dir)
  })

  test('_processInputs no inputs', async () => {
    const bookMd = bookFixtures.makeBookMd()
    const bookMdAfter = bookFixtures.makeBookMd()
    const dir = 'dirPath'
    const spyProcessSearch = vi.spyOn(bookLib._private, '_search')
    const spyDownloadCover = vi.spyOn(bookLib._private, '_downloadCover')

    const bookMdProcessed = await bookLib._private._processInputs(
      bookMd as bookLib.BookMdWithCover,
      dir
    )

    expect(bookMdProcessed).toEqual(bookMdAfter)
    expect(spyProcessSearch).not.toHaveBeenCalled()
    expect(spyDownloadCover).not.toHaveBeenCalled()
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
      keywords: [...work.subject, ...work.place].join(','),
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
})
