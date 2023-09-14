import { Stats, existsSync } from 'fs'
import { copyFile, stat, unlink, writeFile } from 'fs/promises'
import path from 'path'
import sharp, { Metadata, Sharp } from 'sharp'
import * as bookLib from './book.js'
import * as bookFixtures from './book.fixtures.js'
import * as openLibraryFixtures from './open-library.fixtures.js'
import * as googleBooksFixtures from './google-books.fixtures.js'
import { findVolume } from './google-books.js'
import { generateTags, generateDescription } from './openai.js'
import log from '../log.js'
import { addFrontMatter, extract } from '../md.js'
import { findWork, getBook, getCoverUrl } from './open-library.js'
import { downloadTo } from '../web.js'
import { FileTypeResult, fileTypeFromFile } from 'file-type'
import { describe, expect, test, vi, afterEach, beforeEach, SpyInstance } from 'vitest'
import { CpuInfo, cpus } from 'os'
import { makeBooks } from './books.mock.js'

vi.mock('file-type')
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('sharp')
vi.mock('../web')
vi.mock('./open-library')
vi.mock('./google-books')
vi.mock('./openai')
vi.mock('../md')
vi.mock('os')
vi.mock('../log')

const mocks = {
	cpus: vi.mocked(cpus),
	addFrontMatter: vi.mocked(addFrontMatter),
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
	writeFile: vi.mocked(writeFile),
	existSync: vi.mocked(existsSync),
	generateTags: vi.mocked(generateTags),
	generateDescription: vi.mocked(generateDescription),
}

const spies: SpyInstance[] = []

describe('lib/book', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		spies.forEach((spy) => {
			spy.mockRestore()
		})

		vi.useRealTimers()
	})

	test('bookMdToString', async () => {
		const book = bookFixtures.makeBookMd()
		const randomBookString = 'a tale of two scripts'

		mocks.addFrontMatter.mockReturnValue(randomBookString)
		const bookString = bookLib.bookMdToString(book)

		expect(bookString).toBe(randomBookString)
	})

	test('markBookAsSynced', async () => {
		const books = makeBooks()
		const book = bookFixtures.makeBook()
		const spyUpdateCache = vi.spyOn(books.cache, 'update')

		spyUpdateCache.mockResolvedValueOnce()

		await bookLib.markBookAsSynced(books, book)

		spies.push(spyUpdateCache)

		expect(spyUpdateCache).toHaveBeenCalledWith(book.slug, {
			lastSynced: expect.any(String),
			database: expect.objectContaining({
				id: book.id,
				title: book.title,
				author: book.author,
			}),
		})
	})

	test('_makeBookMd', async () => {
		const bookMd = bookFixtures.makeBookMd()
		const bookMd2 = bookLib._private._makeBookMd(
			path.basename(bookMd.filename, '.md'),
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

	test('getBook', async () => {
		const bookMd = bookFixtures.makeBookMd()
		const bookSlugs = path.basename(bookMd.filename, '.md')
		const books = makeBooks()

		mocks.extract.mockResolvedValueOnce(bookMd as Awaited<ReturnType<typeof mocks.extract>>)

		const bookMdExtracted = await bookLib.getBook(books, bookSlugs)

		expect(bookMdExtracted).toEqual(bookMd)
	})

	test('getBook returns null on error', async () => {
		const bookMd = bookFixtures.makeBookMd()
		const bookSlugs = path.basename(bookMd.filename, '.md')
		const books = makeBooks()

		mocks.extract.mockRejectedValueOnce(new Error('boom'))

		const bookMdExtracted = await bookLib.getBook(books, bookSlugs)

		expect(bookMdExtracted).toBeNull()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('bookMdToBookCreateInput', async () => {
		const bookMd = bookFixtures.makeBookMd()
		const bookInsert = bookFixtures.makeBookInsert({
			title: bookMd.frontmatter.title,
			author: bookMd.frontmatter.author,
			note: bookMd.markdown,
			slug: path.basename(bookMd.filename, '.md'),
			year_read: 2022,
			month_read: 12,
		})
		const books = makeBooks()
		const bookInput = bookFixtures.makeBookCreateInput(bookInsert)
		const spyGetCoverData = vi.spyOn(bookLib._private, '_maybeGetCoverData')

		spyGetCoverData.mockResolvedValueOnce(bookInput)

		const bookCreateInput = await bookLib.bookMdToBookCreateInput(books, bookMd)

		spies.push(spyGetCoverData)

		expect(spyGetCoverData).toHaveBeenCalledWith(
			books,
			bookMd,
			expect.objectContaining({
				...bookMd.frontmatter,
				note: bookMd.markdown,
				slug: bookInsert.slug,
				read_order: expect.stringMatching(/^[0-9]+-[0-9,a-f]+$/),
			})
		)
		expect(bookCreateInput).toEqual(bookInput)
	})

	test('bookMdToBookUpdateInput', async () => {
		const title = 'a new title'
		const bookMd = bookFixtures.makeBookMd()
		const bookDetails = {
			title: bookMd.frontmatter.title,
			author: bookMd.frontmatter.author,
			note: bookMd.markdown,
			slug: path.basename(bookMd.filename, '.md'),
		}
		const book = bookFixtures.makeBook(bookDetails)
		const bookUpdate = bookFixtures.makeBookInsert(bookDetails)
		const books = makeBooks()
		const bookInput = bookFixtures.makeBookUpdateInput(bookUpdate)
		const spyGetCoverData = vi.spyOn(bookLib._private, '_maybeGetCoverData')

		spyGetCoverData.mockResolvedValueOnce(bookInput)
		bookMd.frontmatter.title = title

		const bookUpdateInput = await bookLib.bookMdToBookUpdateInput(books, bookMd, book)

		spies.push(spyGetCoverData)

		expect(spyGetCoverData).toHaveBeenCalledWith(books, bookMd, {
			title,
			date_updated: expect.any(Number),
		})
		expect(bookUpdateInput).toEqual(bookInput)
	})

	test('bookMdToBookUpdateInput updates read order', async () => {
		const title = 'a new title'
		const bookMd = bookFixtures.makeBookMd({ frontmatter: { year_read: 2020, month_read: 1 } })
		const bookDetails = {
			title: bookMd.frontmatter.title,
			author: bookMd.frontmatter.author,
			note: bookMd.markdown,
			slug: path.basename(bookMd.filename, '.md'),
			year_read: 2021,
			month_read: bookMd.frontmatter.month_read,
		}

		const book = bookFixtures.makeBook(bookDetails)
		const bookInsert = bookFixtures.makeBookInsert(bookDetails)
		const bookInput = bookFixtures.makeBookUpdateInput(bookInsert)
		const books = makeBooks()
		const maybeGetCoverData = vi.spyOn(bookLib._private, '_maybeGetCoverData')

		maybeGetCoverData.mockResolvedValueOnce(bookInput)
		bookMd.frontmatter.title = title

		const bookUpdateInput = await bookLib.bookMdToBookUpdateInput(books, bookMd, book)

		spies.push(maybeGetCoverData)

		expect(maybeGetCoverData).toHaveBeenCalledWith(books, bookMd, {
			title,
			read_order: expect.any(String),
			year_read: bookMd.frontmatter.year_read,
			date_updated: expect.any(Number),
		})
		expect(bookUpdateInput).toEqual(bookInput)
	})

	test('bookMdToBookUpdateInput has no update', async () => {
		const bookMd = bookFixtures.makeBookMd()
		const bookDetails = {
			title: bookMd.frontmatter.title,
			author: bookMd.frontmatter.author,
			note: bookMd.markdown,
			slug: path.basename(bookMd.filename, '.md'),
		}

		const book = bookFixtures.makeBook(bookDetails)
		const books = makeBooks()
		const maybeGetCoverData = vi.spyOn(bookLib._private, '_maybeGetCoverData')

		maybeGetCoverData.mockResolvedValueOnce({})

		const bookUpdateInput = await bookLib.bookMdToBookUpdateInput(books, bookMd, book)

		expect(bookUpdateInput).toEqual({ date_updated: expect.any(Number) })
	})

	test('_getCoverData', async () => {
		const width = 10
		const height = 15
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

		const coverData = await bookLib._private._getCoverData(coverPath)

		expect(mocks.sharp).toHaveBeenCalledWith(coverPath)
		expect(coverData).toEqual({
			cover_width: width,
			cover_height: height,
		})
	})

	test('_downloadCover with url', async () => {
		const cover = 'https://somewhere'
		const temp = 'somewhere/else/cover.jpg'
		const toPath = 'path/to/books'
		const slug = 'else'
		const books = makeBooks()

		const getPathSpy = vi.spyOn(books, 'getPathForBookCover')
		const makeCoversSpy = vi.spyOn(bookLib._private, '_makeCoverThumbnails')

		getPathSpy.mockReturnValue(toPath)
		makeCoversSpy.mockResolvedValueOnce()
		mocks.downloadTo.mockResolvedValueOnce(temp)
		mocks.fromFile.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)

		spies.push(getPathSpy)
		spies.push(makeCoversSpy)

		const succeed = await bookLib._private._downloadCover(books, slug, cover)

		expect(mocks.downloadTo).toHaveBeenCalledWith(cover)
		expect(mocks.copyFile).toHaveBeenCalledOnce()
		expect(mocks.unlink).toHaveBeenCalledWith(temp)
		expect(succeed).toBe(true)
	})

	test('_download with url rejects .png', async () => {
		const cover = 'https://somewhere'
		const temp = 'somewhere/else/cover.png'
		const slug = '1984'
		const books = makeBooks()

		mocks.downloadTo.mockResolvedValueOnce(temp)
		mocks.fromFile.mockResolvedValueOnce({ ext: 'png' } as FileTypeResult)

		const success = await bookLib._private._downloadCover(books, slug, cover)

		expect(success).toBe(false)
		expect(mocks.downloadTo).toHaveBeenCalledWith(cover)
		expect(mocks.copyFile).not.toHaveBeenCalled()
		expect(mocks.unlink).toHaveBeenCalledWith(temp)
	})

	test('_download with file', async () => {
		const cover = '../somewhere/here/cover.jpg'
		const books = makeBooks()
		const slug = '1984'
		const spyThumbs = vi.spyOn(bookLib._private, '_makeCoverThumbnails')

		spyThumbs.mockResolvedValueOnce()
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)
		mocks.fromFile.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)

		const success = await bookLib._private._downloadCover(books, slug, cover)

		spies.push(spyThumbs)

		expect(success).toBe(true)
		expect(spyThumbs).toHaveBeenCalledOnce()
		expect(mocks.stat).toHaveBeenCalledWith(cover)
		expect(mocks.fromFile).toHaveBeenCalledWith(cover)
		expect(mocks.copyFile).toHaveBeenCalledOnce()
	})

	test('_download with file rejects .png', async () => {
		const cover = '../somewhere/here/cover.png'
		const slug = 'else'
		const books = makeBooks()

		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)
		mocks.fromFile.mockResolvedValueOnce({ ext: 'png' } as FileTypeResult)

		const success = await bookLib._private._downloadCover(books, slug, cover)

		expect(success).toBe(false)
		expect(mocks.stat).toHaveBeenCalledWith(cover)
		expect(mocks.fromFile).toHaveBeenCalledWith(cover)
		expect(mocks.copyFile).not.toHaveBeenCalled()
	})

	test('_download rejects non existant file', async () => {
		const cover = '../somewhere/here/cover.png'
		const slug = 'else'
		const books = makeBooks()

		mocks.stat.mockResolvedValueOnce({ isFile: () => false } as Stats)

		const success = await bookLib._private._downloadCover(books, slug, cover)

		expect(success).toBe(false)
		expect(mocks.stat).toHaveBeenCalledWith(cover)
		expect(mocks.fromFile).not.toHaveBeenCalled()
		expect(mocks.copyFile).not.toHaveBeenCalled()
	})

	test('downloadCover', async () => {
		const cover = 'somewhere/here/cover.png'
		const bookMd = bookFixtures.makeBookMd()
		const books = makeBooks()

		const spyDownload = vi.spyOn(bookLib._private, '_downloadCover')
		spyDownload.mockResolvedValueOnce(true)

		const bookMdOutput = await bookLib.downloadCover(books, bookMd, cover)

		spies.push(spyDownload)

		expect(spyDownload).toHaveBeenCalled()
		bookMd.frontmatter.cover_path = expect.any(String)
		expect(bookMdOutput).toEqual(bookMd)
	})

	test('searchOpenLibrary', async () => {
		const workId = 'work-id'
		const bookId = 'book-id'
		const slug = 'b'
		const books = makeBooks()
		const book = openLibraryFixtures.makeOpenLibraryBook({ works: [{ key: `/works/${workId}` }] })
		const work = openLibraryFixtures.makeOpenLibrarySearchWork()
		const coverUrl = 'https://somewhere'
		const bookMd = bookFixtures.makeBookMd({ frontmatter: { id_ol_book: bookId } })

		const download = vi.spyOn(bookLib._private, '_downloadCover')

		mocks.getBook.mockResolvedValueOnce(book)
		mocks.findWork.mockResolvedValueOnce(work)
		mocks.getCoverUrl.mockReturnValue(coverUrl)
		download.mockResolvedValueOnce(true)

		const bookMetadata = await bookLib.searchOpenLibrary(
			books,
			bookId,
			slug,
			bookMd.frontmatter.title,
			bookMd.frontmatter.author
		)

		spies.push(download)

		expect(mocks.getBook).toHaveBeenCalledWith(bookId)
		expect(mocks.findWork).toHaveBeenCalledWith(workId)
		expect(mocks.getCoverUrl).toHaveBeenCalledWith(work.cover_i)
		expect(download).toHaveBeenCalledOnce()
		expect(bookMetadata).toEqual({
			title: bookMd.frontmatter.title,
			author: bookMd.frontmatter.author,
			subtitle: book.subtitle,
			id_ol_work: workId,
			year_first_published: work.first_publish_year,
			cover_path: expect.any(String),
		})
	})

	test('searchOpenLibrary all metadata', async () => {
		const workId = 'work-id'
		const bookId = 'book-id'
		const slug = 'b'
		const books = makeBooks()
		const book = openLibraryFixtures.makeOpenLibraryBook({
			works: [{ key: `/works/${workId}` }],
		})
		const work = openLibraryFixtures.makeOpenLibrarySearchWork({
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
		const download = vi.spyOn(bookLib._private, '_downloadCover')

		mocks.getBook.mockResolvedValueOnce(book)
		mocks.findWork.mockResolvedValueOnce(work)
		mocks.getCoverUrl.mockReturnValue(coverUrl)
		download.mockResolvedValueOnce(true)

		const bookMetadata = await bookLib.searchOpenLibrary(
			books,
			bookId,
			slug,
			bookMd.frontmatter.title,
			bookMd.frontmatter.author
		)

		spies.push(download)

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
			year_first_published: work.first_publish_year,
			cover_path: expect.any(String),
		})
	})

	test('searchOpenLibrary throws', async () => {
		const bookId = 'book-id'
		const books = makeBooks()
		const work = openLibraryFixtures.makeOpenLibrarySearchWork()
		const coverUrl = 'https://somewhere'
		const bookMd = bookFixtures.makeBookMd({ frontmatter: { id_ol_book: bookId } })
		const slug = 'b'

		mocks.getBook.mockResolvedValueOnce(null)
		mocks.findWork.mockResolvedValueOnce(work)
		mocks.getCoverUrl.mockReturnValue(coverUrl)

		const bookMetadataCall = bookLib.searchOpenLibrary(
			books,
			bookId,
			slug,
			bookMd.frontmatter.title,
			bookMd.frontmatter.author
		)

		expect(bookMetadataCall).rejects.toThrowError()
		expect(mocks.getBook).toHaveBeenCalledWith(bookId)
		expect(mocks.findWork).not.toHaveBeenCalled()
	})

	test('searchGooogleBooks', async () => {
		const openAIKey = 'key'
		const bookMd = bookFixtures.makeBookMd()
		const tags = ['tag1', 'tag2']
		const description = 'a tiny description'

		mocks.generateDescription.mockResolvedValueOnce(description)
		mocks.generateTags.mockResolvedValueOnce(tags)

		const bookMetadata = await bookLib.completeOpenAI(openAIKey, bookMd)

		expect(mocks.generateDescription).toHaveBeenCalledOnce()
		expect(mocks.generateTags).toHaveBeenCalledOnce()
		expect(bookMetadata).toContain({
			keywords: tags.join(','),
			description,
		})
	})

	test('searchGooogleBooks', async () => {
		const title = 'a book title'
		const author = 'a book author'
		const googleApikey = 'key'
		const volume = googleBooksFixtures.makeVolume()

		mocks.findVolume.mockResolvedValueOnce(volume)

		const bookMetadata = await bookLib.searchGoogleBooks(googleApikey, title, author)

		expect(mocks.findVolume).toHaveBeenCalledWith(googleApikey, title, author)
		expect(bookMetadata).toEqual({
			title,
			author,
		})
	})

	test('searchGooogleBooks all metadata', async () => {
		const title = 'a book title'
		const author = 'a book author'
		const subtitle = 'a book subtitle'
		const authors = ['one author', 'co author']
		const apiKey = 'key'
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

		const bookMetadata = await bookLib.searchGoogleBooks(apiKey, title, author)

		expect(mocks.findVolume).toHaveBeenCalledWith(apiKey, title, author)
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

	test('searchGooogleBooks throws', async () => {
		const title = 'a book title'
		const author = 'a book author'
		const apiKey = 'key'

		mocks.findVolume.mockResolvedValueOnce(null)

		const bookMetadataCall = bookLib.searchGoogleBooks(apiKey, title, author)

		expect(bookMetadataCall).rejects.toThrowError()
		expect(mocks.findVolume).toHaveBeenCalledWith(apiKey, title, author)
	})

	test('getUpdatedSlugs', async () => {
		const slugs: string[] = ['a', 'b', 'c']
		const updated = new Date('2201-11-11')
		const cacheUpdated = new Date('2101-11-11')
		const books = makeBooks()

		const spyGetCache = vi.spyOn(books.cache, 'get')
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.stat.mockResolvedValue({ mtime: updated } as Stats)
		spyGetCache.mockResolvedValue({ lastProcessed: cacheUpdated.toJSON() })

		const updatedSlugs = await bookLib.getUpdatedSlugs(slugs, books, 'lastProcessed')

		expect(updatedSlugs).toHaveLength(3)
	})

	test('getUpdatedSlugs lastProcessed', async () => {
		const slugs: string[] = ['a', 'b', 'c']
		const books = makeBooks()
		const cacheUpdated = new Date('2101-11-11')
		const updated = new Date('2201-11-11')

		const spyGetCache = vi.spyOn(books.cache, 'get')
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.stat.mockResolvedValueOnce({ mtime: cacheUpdated } as Stats)
		mocks.stat.mockResolvedValue({ mtime: updated } as Stats)
		spyGetCache.mockResolvedValue({ lastProcessed: cacheUpdated.toJSON() })

		const updatedSlugs = await bookLib.getUpdatedSlugs(slugs, books, 'lastProcessed')

		expect(updatedSlugs).toHaveLength(2)
	})

	test('getUpdatedSlugs lastProcessed not present', async () => {
		const slugs: string[] = ['a', 'b', 'c']
		const books = makeBooks()
		const cacheUpdated = new Date('2101-11-11')
		const updated = new Date('2201-11-11')

		const spyGetCache = vi.spyOn(books.cache, 'get')
		mocks.cpus.mockReturnValue([{} as CpuInfo])
		mocks.stat.mockResolvedValueOnce({ mtime: cacheUpdated } as Stats)
		mocks.stat.mockResolvedValue({ mtime: updated } as Stats)
		spyGetCache.mockResolvedValue({})

		const updatedSlugs = await bookLib.getUpdatedSlugs(slugs, books, 'lastProcessed')

		expect(updatedSlugs).toHaveLength(slugs.length)
	})

	test('getUpdatedSlugs skips on file failure', async () => {
		const slugs: string[] = ['a']
		const lastSynced = new Date('2101-11-11')
		const books = makeBooks()
		const getCache = vi.spyOn(books.cache, 'get')

		mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
		mocks.stat.mockRejectedValueOnce(new Error('boom'))
		getCache.mockResolvedValue({ lastSynced: lastSynced.toJSON() })

		spies.push(getCache)

		const updatedSlugs = await bookLib.getUpdatedSlugs(slugs, books, 'lastSynced')

		expect(updatedSlugs).toEqual([])
	})

	test('cleanUpDerivatives', async () => {
		const bookFiles = ['a.md']
		const cacheFiles = ['a.json', 'b.json']
		const books = makeBooks()

		mocks.unlink.mockResolvedValue()
		mocks.existSync.mockReturnValueOnce(true)
		mocks.existSync.mockReturnValueOnce(false)
		mocks.cpus.mockReturnValueOnce([{} as CpuInfo])

		const spyGetAllFiles = vi.spyOn(books.cache, 'getAllFiles')
		const spyGetAllSlugs = vi.spyOn(books, 'getAllSlugs')
		spyGetAllFiles.mockResolvedValue(cacheFiles)
		spyGetAllSlugs.mockResolvedValue(bookFiles)

		await bookLib.cleanUpDerivatives(books)

		spies.push(spyGetAllFiles, spyGetAllSlugs)

		expect(mocks.unlink).toHaveBeenCalledTimes(bookFiles.length)
	})

	test('cleanUpDerivatives removes cache and cover', async () => {
		const bookFiles = ['a.md']
		const cacheFiles = ['a.json', 'b.json']
		const books = makeBooks()

		mocks.unlink.mockResolvedValue()
		mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
		mocks.existSync.mockReturnValueOnce(true)
		mocks.existSync.mockReturnValueOnce(true)

		const spyGetAllFiles = vi.spyOn(books.cache, 'getAllFiles')
		const spyGetAllSlugs = vi.spyOn(books, 'getAllSlugs')
		spyGetAllFiles.mockResolvedValue(cacheFiles)
		spyGetAllSlugs.mockResolvedValue(bookFiles)

		await bookLib.cleanUpDerivatives(books)

		expect(mocks.unlink).toHaveBeenCalledTimes(bookFiles.length * 2)
	})

	test('cleanUpDerivates catches error', async () => {
		const bookFiles = ['a.md']
		const cacheFiles = ['a.json', 'b.json']
		const books = makeBooks()

		mocks.unlink.mockRejectedValueOnce(new Error('boom'))

		const spyGetAllFiles = vi.spyOn(books.cache, 'getAllFiles')
		const spyGetAllSlugs = vi.spyOn(books, 'getAllSlugs')
		spyGetAllFiles.mockResolvedValue(cacheFiles)
		spyGetAllSlugs.mockResolvedValue(bookFiles)

		await bookLib.cleanUpDerivatives(books)

		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('_makeCoverThumbnails', async () => {
		const books = makeBooks()
		const slug = '1984'
		const toPath = 'to/path/image.jpg'
		const spyGetPath = vi.spyOn(books, 'getPathForBookCover')
		const spyGetPathWidth = vi.spyOn(books, 'getPathForBookCoverWidthOf')
		const mockToFile = vi.fn()
		const mockResize = vi.fn(() => {
			return { toFile: mockToFile }
		})

		mocks.sharp.mockReturnValue({ resize: mockResize } as unknown as Sharp)
		spyGetPath.mockReturnValueOnce(toPath)
		spyGetPathWidth.mockReturnValue(toPath)

		await bookLib._private._makeCoverThumbnails(books, slug)

		spies.push(spyGetPath)

		expect(mockToFile).toHaveBeenCalledTimes(8)
		expect(spyGetPathWidth).toHaveBeenCalledTimes(8)
	})

	test('_maybeGetCoverData', async () => {
		const bookMd = bookFixtures.makeBookMd({ frontmatter: { cover_path: 'xay' } })
		const bookInput = bookFixtures.makeBookCreateInput()
		const books = makeBooks()
		const coverData = { cover_width: 100, cover_height: 200 }

		const getCover = vi.spyOn(bookLib._private, '_getCoverData')
		getCover.mockResolvedValueOnce(coverData)

		const data = await bookLib._private._maybeGetCoverData(books, bookMd, bookInput)

		spies.push(getCover)

		expect(getCover).toHaveBeenCalledOnce()
		expect(data).toEqual({ ...bookInput, ...coverData })
	})

	test('_maybeGetCoverData returns no cover', async () => {
		const bookMd = bookFixtures.makeBookMd()
		const bookInput = bookFixtures.makeBookCreateInput()
		const books = makeBooks()

		const data = await bookLib._private._maybeGetCoverData(books, bookMd, bookInput)

		expect(data).toEqual(bookInput)
	})

	test('writeBookMd', async () => {
		const bookMd = bookFixtures.makeBookMd()
		const books = makeBooks()

		const updateCache = vi.spyOn(books.cache, 'update')
		updateCache.mockResolvedValueOnce()

		mocks.writeFile.mockResolvedValueOnce()
		mocks.stat.mockResolvedValueOnce({ mtime: new Date() } as Stats)
		mocks.stat.mockRejectedValueOnce(new Error('not found'))

		await bookLib.writeBookMd(books, bookMd)

		spies.push(updateCache)

		expect(mocks.writeFile).toHaveBeenCalledOnce()
		expect(updateCache).toHaveBeenCalledOnce()
	})

	test('writeBookMd with cover', async () => {
		const bookMd = bookFixtures.makeBookMd()
		const books = makeBooks()

		const updateCache = vi.spyOn(books.cache, 'update')
		updateCache.mockResolvedValueOnce()

		mocks.writeFile.mockResolvedValueOnce()
		mocks.stat.mockResolvedValue({ mtime: new Date() } as Stats)

		await bookLib.writeBookMd(books, bookMd)

		expect(mocks.writeFile).toHaveBeenCalledOnce()
		expect(updateCache).toHaveBeenCalledWith(expect.any(String), {
			lastProcessed: expect.any(String),
		})
	})

	test('createBookMd', async () => {
		const bookMd = bookFixtures.makeBookMd()
		const makeBook = vi.spyOn(bookLib._private, '_makeBookMd')

		makeBook.mockReturnValueOnce(bookMd)

		const createdBookMd = await bookLib.createBookMd(
			bookMd.frontmatter.title,
			bookMd.markdown,
			bookMd.frontmatter
		)

		spies.push(makeBook)

		expect(makeBook).toHaveBeenCalledWith(
			bookMd.frontmatter.title.toLowerCase().replace(/\s+/g, '-'),
			bookMd.markdown,
			bookMd.frontmatter
		)
		expect(createdBookMd).toEqual(bookMd)
	})

	test('bookToMd', async () => {
		const book = bookFixtures.makeBook()
		const make = vi.spyOn(bookLib._private, '_makeBookMd')

		await bookLib.bookToMd(book)

		spies.push(make)

		expect(make).toHaveBeenCalled()
	})
})
