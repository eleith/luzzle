import { existsSync } from 'fs'
import { copyFile, stat, unlink, writeFile } from 'fs/promises'
import sharp, { Metadata, Sharp } from 'sharp'
import * as bookFixtures from './book.fixtures.js'
import * as openLibraryFixtures from './open-library.fixtures.js'
import * as googleBooksFixtures from './google-books.fixtures.js'
import { findVolume } from './google-books.js'
import { generateTags, generateDescription } from './openai.js'
import log from '../../lib/log.js'
import { addFrontMatter, extract } from '../../lib/md.js'
import { findWork, getBook, getCoverUrl } from './open-library.js'
import { downloadToTmp } from '../../lib/web.js'
import { fileTypeFromFile, FileTypeResult } from 'file-type'
import { describe, expect, test, vi, afterEach, beforeEach, SpyInstance } from 'vitest'
import { CpuInfo, cpus } from 'os'
import BookPiece from './piece.js'
import { Piece, PieceDirectories, toValidatedMarkDown } from '../../lib/pieces/index.js'
import { ASSETS_DIRECTORY } from '../../lib/assets.js'
import { mockConfig } from '../../lib/config.mock.js'

vi.mock('file-type')
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('sharp')
vi.mock('../../lib/web')
vi.mock('./open-library')
vi.mock('./google-books')
vi.mock('./openai')
vi.mock('../../lib/md')
vi.mock('os')
vi.mock('../../lib/log')
vi.mock('../../lib/pieces/index')

const mocks = {
	cpus: vi.mocked(cpus),
	addFrontMatter: vi.mocked(addFrontMatter),
	extract: vi.mocked(extract),
	copyFile: vi.mocked(copyFile),
	unlink: vi.mocked(unlink),
	stat: vi.mocked(stat),
	downloadTo: vi.mocked(downloadToTmp),
	findVolume: vi.mocked(findVolume),
	getCoverUrl: vi.mocked(getCoverUrl),
	getBook: vi.mocked(getBook),
	findWork: vi.mocked(findWork),
	logError: vi.mocked(log.error),
	logWarn: vi.mocked(log.warn),
	logInfo: vi.mocked(log.info),
	sharp: vi.mocked(sharp),
	fromFile: vi.mocked(fileTypeFromFile),
	writeFile: vi.mocked(writeFile),
	existSync: vi.mocked(existsSync),
	generateTags: vi.mocked(generateTags),
	generateDescription: vi.mocked(generateDescription),
	BookPieceDirectories: vi.spyOn(BookPiece.prototype, 'directories', 'get'),
	BookPieceGetFileName: vi.spyOn(BookPiece.prototype, 'getFileName'),
	BookPieceCache: vi.spyOn(BookPiece.prototype, 'cache', 'get'),
	PieceCleanUpCache: vi.spyOn(Piece.prototype, 'cleanUpCache'),
	toMarkDown: vi.mocked(toValidatedMarkDown),
	fileTypeFromFile: vi.mocked(fileTypeFromFile),
}

const spies: Record<string, SpyInstance> = {}

describe('lib/books/piece', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((name) => {
			spies[name].mockRestore()
			delete spies[name]
		})

		vi.useRealTimers()
	})

	test('constructor', () => {
		new BookPiece('root')
	})

	test('getCoverPath', () => {
		const slug = 'slug'

		const coverPath = new BookPiece('root').getRelativeCoverPath(slug)

		expect(coverPath).toMatch(new RegExp(`^${ASSETS_DIRECTORY}.+\\.jpg$`))
	})

	test('getRelativeCoverPath', () => {
		const slug = 'slug'
		const assetsDir = 'assets'

		mocks.BookPieceDirectories.mockReturnValueOnce({ assets: assetsDir } as PieceDirectories)

		new BookPiece('root').getCoverPath(slug)

		expect(mocks.BookPieceDirectories).toHaveBeenCalledOnce()
	})

	test('toCreateInput', async () => {
		const bookInsert = bookFixtures.makeBookInsert()
		const bookMarkdown = bookFixtures.makeBookMarkDown()

		const bookPiece = new BookPiece('root')

		spies.maybeGetCoverData = vi.spyOn(bookPiece, 'maybeGetCoverData').mockResolvedValue(bookInsert)

		const input = await bookPiece.toCreateInput(bookMarkdown)

		expect(spies.maybeGetCoverData).toHaveBeenCalledOnce()
		expect(input).toEqual(bookInsert)
	})

	test('toUpdateInput', async () => {
		const bookUpdate = bookFixtures.makeBookUpdateInput()
		const book = bookFixtures.makeBook()
		const bookMarkdown = bookFixtures.makeBookMarkDown()

		const bookPiece = new BookPiece('root')

		spies.maybeGetCoverData = vi.spyOn(bookPiece, 'maybeGetCoverData').mockResolvedValue(bookUpdate)

		const update = await bookPiece.toUpdateInput(bookMarkdown, book)

		expect(spies.maybeGetCoverData).toHaveBeenCalledOnce()
		expect(update).toEqual(bookUpdate)
	})

	test('toUpdateInput calculates read order', async () => {
		const readMetadata = { year_read: 2020, month_read: 1 }
		const bookUpdate = bookFixtures.makeBookUpdateInput(readMetadata)
		const book = bookFixtures.makeBook()
		const bookMarkdown = bookFixtures.makeBookMarkDown({ frontmatter: readMetadata })

		const bookPiece = new BookPiece('root')

		spies.maybeGetCoverData = vi.spyOn(bookPiece, 'maybeGetCoverData').mockResolvedValue(bookUpdate)

		await bookPiece.toUpdateInput(bookMarkdown, book)

		expect(spies.maybeGetCoverData).toHaveBeenCalledWith(
			bookMarkdown,
			expect.objectContaining({ read_order: expect.any(String) })
		)
	})

	test('toUpdateInput only updates timestamp', async () => {
		const readMetadata = { year_read: 2020, month_read: 1 }
		const book = bookFixtures.makeBook()
		const bookMarkdown = bookFixtures.makeBookMarkDown({ frontmatter: readMetadata })

		const bookPiece = new BookPiece('root')

		spies.maybeGetCoverData = vi.spyOn(bookPiece, 'maybeGetCoverData').mockResolvedValue({})

		const update = await bookPiece.toUpdateInput(bookMarkdown, book)

		expect(update).toEqual(expect.objectContaining({ date_updated: expect.any(Number) }))
	})

	test('makeCoverThumbnails', async () => {
		const slug = 'slug'
		const assetsDir = 'assets'

		spies.sharpToFile = vi.fn()
		spies.sharpResize = vi.fn(() => ({ toFile: spies.sharpToFile }))

		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetsDir,
			'assets.cache': assetsDir,
		} as PieceDirectories)
		mocks.sharp.mockReturnValue({ resize: spies.sharpResize } as unknown as Sharp)

		await new BookPiece('root').makeCoverThumbnails(slug)

		expect(spies.sharpToFile).toHaveBeenCalledTimes(8)
		expect(mocks.BookPieceDirectories).toHaveBeenCalledTimes(9)
	})

	test('searchOpenLibrary', async () => {
		const workId = 'work-id'
		const bookId = 'book-id'
		const slug = 'b'
		const book = openLibraryFixtures.makeOpenLibraryBook({ works: [{ key: `/works/${workId}` }] })
		const work = openLibraryFixtures.makeOpenLibrarySearchWork({ cover_i: undefined })
		const bookMd = bookFixtures.makeBookMarkDown({ frontmatter: { id_ol_book: bookId } })

		mocks.getBook.mockResolvedValueOnce(book)
		mocks.findWork.mockResolvedValueOnce(work)
		mocks.BookPieceDirectories.mockReturnValue({ assets: 'assets' } as PieceDirectories)

		const bookPiece = new BookPiece('root')

		const bookMetadata = await bookPiece.searchOpenLibrary(
			bookId,
			slug,
			bookMd.frontmatter.title,
			bookMd.frontmatter.author
		)

		expect(mocks.getBook).toHaveBeenCalledWith(bookId)
		expect(mocks.findWork).toHaveBeenCalledWith(workId)
		expect(bookMetadata).toEqual({
			title: bookMd.frontmatter.title,
			author: bookMd.frontmatter.author,
			subtitle: book.subtitle,
			id_ol_work: workId,
			year_first_published: work.first_publish_year,
		})
	})

	test('searchOpenLibrary full metadata', async () => {
		const workId = 'work-id'
		const bookId = 'book-id'
		const slug = 'b'
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
		const bookMd = bookFixtures.makeBookMarkDown({ frontmatter: { id_ol_book: bookId } })
		const coverPath = 'path/to/file'
		const tmpFile = 'tmp/file'

		mocks.getBook.mockResolvedValueOnce(book)
		mocks.findWork.mockResolvedValueOnce(work)
		mocks.getCoverUrl.mockReturnValue(coverUrl)
		mocks.BookPieceDirectories.mockReturnValue({ assets: 'assets' } as PieceDirectories)
		mocks.downloadTo.mockResolvedValue(tmpFile)
		mocks.unlink.mockResolvedValue()

		const bookPiece = new BookPiece('root')

		spies.attachCover = vi.spyOn(bookPiece, 'attachCover').mockResolvedValueOnce(coverPath)

		const bookMetadata = await bookPiece.searchOpenLibrary(
			bookId,
			slug,
			bookMd.frontmatter.title,
			bookMd.frontmatter.author
		)

		expect(mocks.getBook).toHaveBeenCalledWith(bookId)
		expect(mocks.findWork).toHaveBeenCalledWith(workId)
		expect(mocks.getCoverUrl).toHaveBeenCalledWith(work.cover_i)
		expect(mocks.unlink).toHaveBeenCalledWith(tmpFile)
		expect(mocks.downloadTo).toHaveBeenCalledWith(coverUrl)
		expect(spies.attachCover).toHaveBeenCalledWith(tmpFile, slug)
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
		const work = openLibraryFixtures.makeOpenLibrarySearchWork()
		const coverUrl = 'https://somewhere'
		const bookMd = bookFixtures.makeBookMarkDown({ frontmatter: { id_ol_book: bookId } })
		const slug = 'b'

		mocks.getBook.mockResolvedValueOnce(null)
		mocks.findWork.mockResolvedValueOnce(work)
		mocks.getCoverUrl.mockReturnValue(coverUrl)

		const searchCall = new BookPiece('root').searchOpenLibrary(
			bookId,
			slug,
			bookMd.frontmatter.title,
			bookMd.frontmatter.author
		)

		expect(searchCall).rejects.toThrowError()
		expect(mocks.getBook).toHaveBeenCalledWith(bookId)
		expect(mocks.findWork).not.toHaveBeenCalled()
	})

	test('completeOpenAI', async () => {
		const openAIKey = 'key'
		const bookMd = bookFixtures.makeBookMarkDown()
		const tags = ['tag1', 'tag2']
		const description = 'a tiny description'

		mocks.generateDescription.mockResolvedValueOnce(description)
		mocks.generateTags.mockResolvedValueOnce(tags)

		const details = await new BookPiece('root').completeOpenAI(openAIKey, bookMd)

		expect(mocks.generateDescription).toHaveBeenCalledOnce()
		expect(mocks.generateTags).toHaveBeenCalledOnce()
		expect(details).toContain({
			keywords: tags.join(','),
			description,
		})
	})

	test('searchGooogleBooks', async () => {
		const title = 'a book title'
		const author = 'a book author'
		const apiKey = 'key'
		const volume = googleBooksFixtures.makeVolume()

		mocks.findVolume.mockResolvedValueOnce(volume)

		const details = await new BookPiece('root').searchGoogleBooks(apiKey, title, author)

		expect(mocks.findVolume).toHaveBeenCalledWith(apiKey, title, author)
		expect(details).toEqual({
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

		const details = await new BookPiece('root').searchGoogleBooks(apiKey, title, author)

		expect(mocks.findVolume).toHaveBeenCalledWith(apiKey, title, author)
		expect(details).toEqual({
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

		const bookCall = new BookPiece('root').searchGoogleBooks(apiKey, title, author)

		expect(bookCall).rejects.toThrowError()
		expect(mocks.findVolume).toHaveBeenCalledWith(apiKey, title, author)
	})

	test('cleanUpCache', async () => {
		const slugs = ['slug1']
		const assetDir = 'assets'

		mocks.unlink.mockResolvedValue()
		mocks.existSync.mockReturnValue(true)
		mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetDir,
			'assets.cache': assetDir,
		} as PieceDirectories)
		mocks.PieceCleanUpCache.mockResolvedValueOnce(slugs)

		await new BookPiece('root').cleanUpCache(slugs)

		expect(mocks.unlink).toHaveBeenCalledTimes(8 + 1)
	})

	test('processCleanUp with no cache', async () => {
		const slugs = ['slug1']
		const assetDir = 'assets'

		mocks.unlink.mockResolvedValue()
		mocks.existSync.mockReturnValue(false)
		mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetDir,
			'assets.cache': assetDir,
		} as PieceDirectories)
		mocks.PieceCleanUpCache.mockResolvedValueOnce(slugs)

		await new BookPiece('root').cleanUpCache(slugs)

		expect(mocks.unlink).toHaveBeenCalledTimes(0)
	})

	test('maybeGetCoverData', async () => {
		const assetDir = 'assets'
		const markdown = bookFixtures.makeBookMarkDown({ frontmatter: { cover_path: 'cover.jpg' } })
		const input = bookFixtures.makeBookInsert()
		const width = 10
		const height = 15

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
		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetDir,
		} as PieceDirectories)

		const bookInput = await new BookPiece('root').maybeGetCoverData(markdown, input)

		expect(bookInput).toEqual({ ...input, cover_width: width, cover_height: height })
	})

	test('maybeGetCoverData skips', async () => {
		const assetDir = 'assets'
		const markdown = bookFixtures.makeBookMarkDown()
		const input = bookFixtures.makeBookInsert()

		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetDir,
		} as PieceDirectories)

		const bookInput = await new BookPiece('root').maybeGetCoverData(markdown, input)

		expect(bookInput).toEqual(input)
	})

	test('attachCover', async () => {
		const filePath = 'path/to/file'
		const slug = 'slug'
		const coverPath = 'path/to/cover.jpg'
		const ext = 'jpg'

		mocks.fileTypeFromFile.mockResolvedValueOnce({ ext } as FileTypeResult)
		mocks.copyFile.mockResolvedValueOnce()

		const bookPiece = new BookPiece('root')

		spies.makeCoverThumbnails = vi.spyOn(bookPiece, 'makeCoverThumbnails').mockResolvedValue()
		spies.getCoverPath = vi.spyOn(bookPiece, 'getCoverPath').mockReturnValue(coverPath)
		spies.getRelativeCoverPath = vi
			.spyOn(bookPiece, 'getRelativeCoverPath')
			.mockReturnValue(coverPath)

		const relativePath = await bookPiece.attachCover(filePath, slug)

		expect(spies.makeCoverThumbnails).toHaveBeenCalledWith(slug)
		expect(mocks.copyFile).toHaveBeenCalledWith(filePath, coverPath)
		expect(relativePath).toEqual(coverPath)
	})

	test('attachCover unsupported extension', async () => {
		const filePath = 'path/to/file'
		const slug = 'slug'
		const coverPath = 'path/to/cover.png'
		const ext = 'png'

		mocks.fileTypeFromFile.mockResolvedValueOnce({ ext } as FileTypeResult)
		mocks.copyFile.mockResolvedValueOnce()

		const bookPiece = new BookPiece('root')

		spies.makeCoverThumbnails = vi.spyOn(bookPiece, 'makeCoverThumbnails').mockResolvedValue()
		spies.getCoverPath = vi.spyOn(bookPiece, 'getCoverPath').mockReturnValue(coverPath)

		const relativePath = await bookPiece.attachCover(filePath, slug)

		expect(spies.makeCoverThumbnails).not.toHaveBeenCalled()
		expect(mocks.copyFile).not.toHaveBeenCalled()
		expect(relativePath).toEqual(null)
	})

	test('attach', async () => {
		const coverPath = '.assets/cover/slug.jpg'
		const tmpPath = 'path/to/file'
		const bookMd = bookFixtures.makeBookMarkDown()

		mocks.BookPieceDirectories.mockReturnValue({ assets: '/path/to/.assets' } as PieceDirectories)

		const bookPiece = new BookPiece('root')

		spies.attachCover = vi.spyOn(bookPiece, 'attachCover').mockResolvedValue(coverPath)
		spies.write = vi.spyOn(bookPiece, 'write').mockResolvedValue()

		await bookPiece.attach(tmpPath, bookMd)

		expect(spies.attachCover).toHaveBeenCalledWith(tmpPath, bookMd.slug)
		expect(spies.write).toHaveBeenCalledWith({
			...bookMd,
			frontmatter: { ...bookMd.frontmatter, cover_path: coverPath },
		})
	})

	test('attach rejects bad field', async () => {
		const coverPath = '.assets/cover/slug.jpg'
		const tmpPath = 'path/to/file'
		const bookMd = bookFixtures.makeBookMarkDown()

		mocks.BookPieceDirectories.mockReturnValue({ assets: '/path/to/.assets' } as PieceDirectories)

		const bookPiece = new BookPiece('root')

		spies.attachCover = vi.spyOn(bookPiece, 'attachCover').mockResolvedValue(coverPath)
		spies.write = vi.spyOn(bookPiece, 'write').mockResolvedValue()

		await bookPiece.attach(tmpPath, bookMd, 'bad_field')

		expect(spies.attachCover).not.toHaveBeenCalled()
		expect(spies.write).not.toHaveBeenCalled()
	})

	test('attach skips writing', async () => {
		const tmpPath = 'path/to/file'
		const bookMd = bookFixtures.makeBookMarkDown()

		mocks.BookPieceDirectories.mockReturnValue({ assets: '/path/to/.assets' } as PieceDirectories)

		const bookPiece = new BookPiece('root')

		spies.attachCover = vi.spyOn(bookPiece, 'attachCover').mockResolvedValue(null)
		spies.write = vi.spyOn(bookPiece, 'write').mockResolvedValue()

		await bookPiece.attach(tmpPath, bookMd)

		expect(spies.attachCover).toHaveBeenCalled()
		expect(spies.write).not.toHaveBeenCalled()
	})

	test('fetch all', async () => {
		const configMock = mockConfig()
		const markdown = bookFixtures.makeBookMarkDown()

		const bookPiece = new BookPiece('root')

		spies.configGet = configMock.get.mockReturnValue({})
		spies.searchGoogleBooks = vi.spyOn(bookPiece, 'searchGoogleBooks')
		spies.completeOpenAI = vi.spyOn(bookPiece, 'completeOpenAI')
		spies.searchOpenLibrary = vi.spyOn(bookPiece, 'searchOpenLibrary')

		const fetched = await bookPiece.fetch(configMock, markdown, 'all')

		expect(spies.searchGoogleBooks).not.toHaveBeenCalled()
		expect(spies.completeOpenAI).not.toHaveBeenCalled()
		expect(spies.searchOpenLibrary).not.toHaveBeenCalled()
		expect(fetched).toEqual(markdown)
	})

	test('fetch google', async () => {
		const configMock = mockConfig()
		const googleKey = 'abc'
		const markdown = bookFixtures.makeBookMarkDown()
		const googleMarkdown = bookFixtures.makeBookMarkDown({
			frontmatter: { description: 'a tiny desc' },
		})

		const bookPiece = new BookPiece('root')

		spies.configGet = configMock.get.mockReturnValue({ google: googleKey })
		spies.searchGoogleBooks = vi
			.spyOn(bookPiece, 'searchGoogleBooks')
			.mockResolvedValueOnce(googleMarkdown.frontmatter)

		const fetched = await bookPiece.fetch(configMock, markdown, 'google')

		expect(spies.searchGoogleBooks).toHaveBeenCalledWith(
			googleKey,
			markdown.frontmatter.title,
			markdown.frontmatter.author
		)
		expect(fetched.frontmatter.description).toBe(googleMarkdown.frontmatter.description)
	})

	test('fetch openai', async () => {
		const configMock = mockConfig()
		const openaiKey = 'abc'
		const markdown = bookFixtures.makeBookMarkDown()
		const openaiMarkdown = bookFixtures.makeBookMarkDown({
			frontmatter: { description: 'a tiny desc' },
		})

		const bookPiece = new BookPiece('root')

		spies.configGet = configMock.get.mockReturnValue({ openai: openaiKey })
		spies.completeOpenAI = vi
			.spyOn(bookPiece, 'completeOpenAI')
			.mockResolvedValueOnce(openaiMarkdown.frontmatter)

		const fetched = await bookPiece.fetch(configMock, markdown, 'openai')

		expect(spies.completeOpenAI).toHaveBeenCalledWith(openaiKey, markdown)
		expect(fetched.frontmatter.description).toBe(openaiMarkdown.frontmatter.description)
	})

	test('run with openlibrary', async () => {
		const configMock = mockConfig()
		const markdown = bookFixtures.makeBookMarkDown({ frontmatter: { id_ol_book: 'book-id' } })
		const libraryMarkdown = bookFixtures.makeBookMarkDown({
			frontmatter: { description: 'a tiny desc' },
		})

		const bookPiece = new BookPiece('root')

		spies.configGet = configMock.get.mockReturnValue({})
		spies.searchOpenLibrary = vi
			.spyOn(bookPiece, 'searchOpenLibrary')
			.mockResolvedValueOnce(libraryMarkdown.frontmatter)

		const fetched = await bookPiece.fetch(configMock, markdown, 'openlibrary')

		expect(spies.searchOpenLibrary).toHaveBeenCalledWith(
			markdown.frontmatter.id_ol_book,
			markdown.slug,
			markdown.frontmatter.title,
			markdown.frontmatter.author
		)
		expect(fetched.frontmatter.description).toBe(libraryMarkdown.frontmatter.description)
	})

	test('process', async () => {
		const slugs = ['slug']

		await new BookPiece('root').process(slugs)

		expect(mocks.logInfo).toHaveBeenCalledOnce()
	})

	test('create', () => {
		const slug = 'slug'
		const title = 'title'
		const markdown = bookFixtures.makeBookMarkDown()

		mocks.toMarkDown.mockReturnValueOnce(markdown)

		new BookPiece('root').create(slug, title)

		expect(mocks.toMarkDown).toHaveBeenCalledOnce()
	})
})
