import { Stats, existsSync } from 'fs'
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
import { downloadTo } from '../../lib/web.js'
import { FileTypeResult, fileTypeFromFile } from 'file-type'
import { describe, expect, test, vi, afterEach, beforeEach, SpyInstance } from 'vitest'
import { CpuInfo, cpus } from 'os'
import BookPiece from './piece.js'
import { Piece, PieceDirectories, toValidatedMarkDown } from '../../lib/pieces/index.js'
import { BookMarkDown } from './book.schemas.js'
import CacheForType from '../../lib/cache.js'
import { Book } from '@luzzle/kysely'
import { PieceCache } from '../../lib/pieces/cache.js'
import { ASSETS_DIRECTORY } from '../../lib/assets.js'

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
	BookPieceDirectories: vi.spyOn(BookPiece.prototype, 'directories', 'get'),
	BookPieceGetFileName: vi.spyOn(BookPiece.prototype, 'getFileName'),
	BookPieceCaches: vi.spyOn(BookPiece.prototype, 'caches', 'get'),
	PieceRemoveStaleCache: vi.spyOn(Piece.prototype, 'removeStaleCache'),
	toMarkDown: vi.mocked(toValidatedMarkDown),
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
		new BookPiece('dir')
	})

	test('getCoverPath', () => {
		const dir = 'dir'
		const slug = 'slug'

		const coverPath = new BookPiece(dir).getRelativeCoverPath(slug)

		expect(coverPath).toMatch(new RegExp(`^${ASSETS_DIRECTORY}.+\\.jpg$`))
	})

	test('getRelativeCoverPath', () => {
		const dir = 'dir'
		const slug = 'slug'
		const assetsDir = 'assets'

		mocks.BookPieceDirectories.mockReturnValueOnce({ assets: assetsDir } as PieceDirectories)

		new BookPiece(dir).getCoverPath(slug)

		expect(mocks.BookPieceDirectories).toHaveBeenCalledOnce()
	})

	test('toMarkDown', () => {
		const dir = 'dir'
		const slug = 'slug'
		const book = bookFixtures.makeBook()
		const filename = `${slug}.md`

		mocks.BookPieceGetFileName.mockReturnValueOnce(filename)
		mocks.toMarkDown.mockResolvedValueOnce({} as BookMarkDown)

		new BookPiece(dir).toMarkDown(book)

		expect(mocks.toMarkDown).toHaveBeenCalledOnce()
	})

	test('markBookAsSynced', async () => {
		const dir = 'dir'
		const book = bookFixtures.makeBook()
		const update = vi.fn(() => Promise.resolve())

		mocks.BookPieceCaches.mockReturnValueOnce({ update } as unknown as CacheForType<
			PieceCache<Book>
		>)

		await new BookPiece(dir).markBookAsSynced(book)

		expect(update).toHaveBeenCalledOnce()
	})

	test('toCreateInput', async () => {
		const dir = 'dir'
		const slug = 'slug'
		const bookInsert = bookFixtures.makeBookInsert()
		const bookMarkdown = bookFixtures.makeBookMarkDown()

		const bookPiece = new BookPiece(dir)

		spies.maybeGetCoverData = vi.spyOn(bookPiece, 'maybeGetCoverData').mockResolvedValue(bookInsert)

		const input = await bookPiece.toCreateInput(slug, bookMarkdown)

		expect(spies.maybeGetCoverData).toHaveBeenCalledOnce()
		expect(input).toEqual(bookInsert)
	})

	test('toUpdateInput', async () => {
		const dir = 'dir'
		const slug = 'slug'
		const bookUpdate = bookFixtures.makeBookUpdateInput()
		const book = bookFixtures.makeBook()
		const bookMarkdown = bookFixtures.makeBookMarkDown()

		const bookPiece = new BookPiece(dir)

		spies.maybeGetCoverData = vi.spyOn(bookPiece, 'maybeGetCoverData').mockResolvedValue(bookUpdate)

		const update = await bookPiece.toUpdateInput(slug, bookMarkdown, book)

		expect(spies.maybeGetCoverData).toHaveBeenCalledOnce()
		expect(update).toEqual(bookUpdate)
	})

	test('toUpdateInput calculates read order', async () => {
		const dir = 'dir'
		const slug = 'slug'
		const readMetadata = { year_read: 2020, month_read: 1 }
		const bookUpdate = bookFixtures.makeBookUpdateInput(readMetadata)
		const book = bookFixtures.makeBook()
		const bookMarkdown = bookFixtures.makeBookMarkDown({ frontmatter: readMetadata })

		const bookPiece = new BookPiece(dir)

		spies.maybeGetCoverData = vi.spyOn(bookPiece, 'maybeGetCoverData').mockResolvedValue(bookUpdate)

		await bookPiece.toUpdateInput(slug, bookMarkdown, book)

		expect(spies.maybeGetCoverData).toHaveBeenCalledWith(
			slug,
			bookMarkdown,
			expect.objectContaining({ read_order: expect.any(String) })
		)
	})

	test('toUpdateInput calculates read order', async () => {
		const dir = 'dir'
		const slug = 'slug'
		const readMetadata = { year_read: 2020, month_read: 1 }
		const bookUpdate = bookFixtures.makeBookUpdateInput(readMetadata)
		const book = bookFixtures.makeBook()
		const bookMarkdown = bookFixtures.makeBookMarkDown({ frontmatter: readMetadata })

		const bookPiece = new BookPiece(dir)

		spies.maybeGetCoverData = vi.spyOn(bookPiece, 'maybeGetCoverData').mockResolvedValue(bookUpdate)

		await bookPiece.toUpdateInput(slug, bookMarkdown, book)

		expect(spies.maybeGetCoverData).toHaveBeenCalledWith(
			slug,
			bookMarkdown,
			expect.objectContaining({ read_order: expect.any(String) })
		)
	})

	test('toUpdateInput only updates timestamp', async () => {
		const dir = 'dir'
		const slug = 'slug'
		const readMetadata = { year_read: 2020, month_read: 1 }
		const book = bookFixtures.makeBook()
		const bookMarkdown = bookFixtures.makeBookMarkDown({ frontmatter: readMetadata })

		const bookPiece = new BookPiece(dir)

		spies.maybeGetCoverData = vi.spyOn(bookPiece, 'maybeGetCoverData').mockResolvedValue({})

		const update = await bookPiece.toUpdateInput(slug, bookMarkdown, book)

		expect(update).toEqual(expect.objectContaining({ date_updated: expect.any(Number) }))
	})

	test('makeCoverThumbnails', async () => {
		const dir = 'dir'
		const slug = 'slug'
		const assetsDir = 'assets'

		spies.sharpToFile = vi.fn()
		spies.sharpResize = vi.fn(() => ({ toFile: spies.sharpToFile }))

		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetsDir,
			'assets.cache': assetsDir,
		} as PieceDirectories)
		mocks.sharp.mockReturnValue({ resize: spies.sharpResize } as unknown as Sharp)

		await new BookPiece(dir).makeCoverThumbnails(slug)

		expect(spies.sharpToFile).toHaveBeenCalledTimes(8)
		expect(mocks.BookPieceDirectories).toHaveBeenCalledTimes(9)
	})

	test('downloadCover url', async () => {
		const cover = 'https://somewhere/online'
		const temp = 'somewhere/else/cover.jpg'
		const slug = 'else'
		const assetsDir = 'assets'
		const dir = 'dir'

		spies.sharpToFile = vi.fn()
		spies.sharpResize = vi.fn(() => ({ toFile: spies.sharpToFile }))
		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetsDir,
			'assets.cache': assetsDir,
		} as PieceDirectories)
		mocks.downloadTo.mockResolvedValueOnce(temp)
		mocks.fromFile.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)
		mocks.sharp.mockReturnValue({ resize: spies.sharpResize } as unknown as Sharp)

		const succeeded = await new BookPiece(dir).downloadCover(slug, cover)

		expect(mocks.downloadTo).toHaveBeenCalledWith(cover)
		expect(mocks.copyFile).toHaveBeenCalledOnce()
		expect(mocks.unlink).toHaveBeenCalledWith(temp)
		expect(succeeded).toBe(true)
	})

	test('downloadCover url rejects .png', async () => {
		const cover = 'https://somewhere/online'
		const slug = 'else'
		const assetsDir = 'assets'
		const dir = 'dir'
		const temp = 'somewhere/else/cover.png'

		spies.sharpToFile = vi.fn()
		spies.sharpResize = vi.fn(() => ({ toFile: spies.sharpToFile }))
		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetsDir,
			'assets.cache': assetsDir,
		} as PieceDirectories)
		mocks.downloadTo.mockResolvedValueOnce(temp)
		mocks.fromFile.mockResolvedValueOnce({ ext: 'png' } as FileTypeResult)
		mocks.sharp.mockReturnValue({ resize: spies.sharpResize } as unknown as Sharp)

		const succeeded = await new BookPiece(dir).downloadCover(slug, cover)

		expect(mocks.downloadTo).toHaveBeenCalledWith(cover)
		expect(mocks.copyFile).not.toHaveBeenCalled()
		expect(succeeded).toBe(false)
	})

	test('downloadCover file', async () => {
		const cover = '../somewhere/here/cover.jpg'
		const slug = 'else'
		const assetsDir = 'assets'
		const dir = 'dir'

		spies.sharpToFile = vi.fn()
		spies.sharpResize = vi.fn(() => ({ toFile: spies.sharpToFile }))
		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetsDir,
			'assets.cache': assetsDir,
		} as PieceDirectories)
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)
		mocks.fromFile.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)
		mocks.sharp.mockReturnValue({ resize: spies.sharpResize } as unknown as Sharp)

		const succeeded = await new BookPiece(dir).downloadCover(slug, cover)

		expect(mocks.stat).toHaveBeenCalledWith(cover)
		expect(mocks.copyFile).toHaveBeenCalled()
		expect(succeeded).toBe(true)
	})

	test('downloadCover file rejects .png', async () => {
		const cover = '../somewhere/here/cover.jpg'
		const slug = 'else'
		const assetsDir = 'assets'
		const dir = 'dir'

		spies.sharpToFile = vi.fn()
		spies.sharpResize = vi.fn(() => ({ toFile: spies.sharpToFile }))
		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetsDir,
			'assets.cache': assetsDir,
		} as PieceDirectories)
		mocks.stat.mockResolvedValueOnce({ isFile: () => true } as Stats)
		mocks.fromFile.mockResolvedValueOnce({ ext: 'png' } as FileTypeResult)
		mocks.sharp.mockReturnValue({ resize: spies.sharpResize } as unknown as Sharp)

		const succeeded = await new BookPiece(dir).downloadCover(slug, cover)

		expect(mocks.stat).toHaveBeenCalledWith(cover)
		expect(mocks.copyFile).not.toHaveBeenCalled()
		expect(succeeded).toBe(false)
	})

	test('downloadCover rejects missing file', async () => {
		const cover = '../somewhere/here/cover.jpg'
		const slug = 'else'
		const assetsDir = 'assets'
		const dir = 'dir'

		spies.sharpToFile = vi.fn()
		spies.sharpResize = vi.fn(() => ({ toFile: spies.sharpToFile }))
		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetsDir,
			'assets.cache': assetsDir,
		} as PieceDirectories)
		mocks.stat.mockResolvedValueOnce({ isFile: () => false } as Stats)
		mocks.fromFile.mockResolvedValueOnce({ ext: 'jpg' } as FileTypeResult)
		mocks.sharp.mockReturnValue({ resize: spies.sharpResize } as unknown as Sharp)

		const succeeded = await new BookPiece(dir).downloadCover(slug, cover)

		expect(mocks.stat).toHaveBeenCalledWith(cover)
		expect(mocks.copyFile).not.toHaveBeenCalled()
		expect(succeeded).toBe(false)
	})

	test('searchOpenLibrary', async () => {
		const dir = 'dir'
		const workId = 'work-id'
		const bookId = 'book-id'
		const slug = 'b'
		const book = openLibraryFixtures.makeOpenLibraryBook({ works: [{ key: `/works/${workId}` }] })
		const work = openLibraryFixtures.makeOpenLibrarySearchWork({ cover_i: undefined })
		const bookMd = bookFixtures.makeBookMarkDown({ frontmatter: { id_ol_book: bookId } })

		mocks.getBook.mockResolvedValueOnce(book)
		mocks.findWork.mockResolvedValueOnce(work)
		mocks.BookPieceDirectories.mockReturnValue({ assets: 'assets' } as PieceDirectories)

		const bookPiece = new BookPiece(dir)

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
		const dir = 'dir'
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

		mocks.getBook.mockResolvedValueOnce(book)
		mocks.findWork.mockResolvedValueOnce(work)
		mocks.getCoverUrl.mockReturnValue(coverUrl)
		mocks.BookPieceDirectories.mockReturnValue({ assets: 'assets' } as PieceDirectories)

		const bookPiece = new BookPiece(dir)

		spies.getPathForCover = vi.spyOn(bookPiece, 'getRelativeCoverPath').mockReturnValue(coverUrl)
		spies.downloadCover = vi.spyOn(bookPiece, 'downloadCover').mockResolvedValue(true)

		const bookMetadata = await bookPiece.searchOpenLibrary(
			bookId,
			slug,
			bookMd.frontmatter.title,
			bookMd.frontmatter.author
		)

		expect(mocks.getBook).toHaveBeenCalledWith(bookId)
		expect(mocks.findWork).toHaveBeenCalledWith(workId)
		expect(mocks.getCoverUrl).toHaveBeenCalledWith(work.cover_i)
		expect(spies.downloadCover).toHaveBeenCalledWith(slug, coverUrl)
		expect(spies.getPathForCover).toHaveBeenCalledWith(slug)
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
		const dir = 'dir'
		const work = openLibraryFixtures.makeOpenLibrarySearchWork()
		const coverUrl = 'https://somewhere'
		const bookMd = bookFixtures.makeBookMarkDown({ frontmatter: { id_ol_book: bookId } })
		const slug = 'b'

		mocks.getBook.mockResolvedValueOnce(null)
		mocks.findWork.mockResolvedValueOnce(work)
		mocks.getCoverUrl.mockReturnValue(coverUrl)

		const searchCall = new BookPiece(dir).searchOpenLibrary(
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
		const dir = 'dir'
		const bookMd = bookFixtures.makeBookMarkDown()
		const tags = ['tag1', 'tag2']
		const description = 'a tiny description'

		mocks.generateDescription.mockResolvedValueOnce(description)
		mocks.generateTags.mockResolvedValueOnce(tags)

		const details = await new BookPiece(dir).completeOpenAI(openAIKey, bookMd)

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
		const dir = 'dir'

		mocks.findVolume.mockResolvedValueOnce(volume)

		const details = await new BookPiece(dir).searchGoogleBooks(apiKey, title, author)

		expect(mocks.findVolume).toHaveBeenCalledWith(apiKey, title, author)
		expect(details).toEqual({
			title,
			author,
		})
	})

	test('searchGooogleBooks all metadata', async () => {
		const dir = 'dir'
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

		const details = await new BookPiece(dir).searchGoogleBooks(apiKey, title, author)

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
		const dir = 'dir'

		mocks.findVolume.mockResolvedValueOnce(null)

		const bookCall = new BookPiece(dir).searchGoogleBooks(apiKey, title, author)

		expect(bookCall).rejects.toThrowError()
		expect(mocks.findVolume).toHaveBeenCalledWith(apiKey, title, author)
	})

	test('removeStaleCache', async () => {
		const slugs = ['slug1']
		const assetDir = 'assets'
		const dir = 'dir'

		mocks.unlink.mockResolvedValue()
		mocks.existSync.mockReturnValue(true)
		mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetDir,
			'assets.cache': assetDir,
		} as PieceDirectories)
		mocks.PieceRemoveStaleCache.mockResolvedValueOnce(slugs)

		await new BookPiece(dir).removeStaleCache()

		expect(mocks.unlink).toHaveBeenCalledTimes(8 + 1)
	})

	test('removeStaleCache with no cache', async () => {
		const slugs = ['slug1']
		const assetDir = 'assets'
		const dir = 'dir'

		mocks.unlink.mockResolvedValue()
		mocks.existSync.mockReturnValue(false)
		mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetDir,
			'assets.cache': assetDir,
		} as PieceDirectories)
		mocks.PieceRemoveStaleCache.mockResolvedValueOnce(slugs)

		await new BookPiece(dir).removeStaleCache()

		expect(mocks.unlink).toHaveBeenCalledTimes(0)
	})

	test('maybeGetCoverData', async () => {
		const assetDir = 'assets'
		const slug = 'slug'
		const markdown = bookFixtures.makeBookMarkDown({ frontmatter: { cover_path: 'cover.jpg' } })
		const input = bookFixtures.makeBookInsert()
		const dir = 'dir'
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

		const bookInput = await new BookPiece(dir).maybeGetCoverData(slug, markdown, input)

		expect(bookInput).toEqual({ ...input, cover_width: width, cover_height: height })
	})

	test('maybeGetCoverData skips', async () => {
		const assetDir = 'assets'
		const slug = 'slug'
		const markdown = bookFixtures.makeBookMarkDown()
		const input = bookFixtures.makeBookInsert()
		const dir = 'dir'

		mocks.BookPieceDirectories.mockReturnValue({
			assets: assetDir,
		} as PieceDirectories)

		const bookInput = await new BookPiece(dir).maybeGetCoverData(slug, markdown, input)

		expect(bookInput).toEqual(input)
	})

	test('attach', async () => {
		const slug = 'b'
		const dir = 'dir'
		const coverUrl = 'https://somewhere'
		const coverPath = '.assets/cover/slug.jpg'
		const bookMd = bookFixtures.makeBookMarkDown()

		mocks.BookPieceDirectories.mockReturnValue({ assets: '/path/to/.assets' } as PieceDirectories)

		const bookPiece = new BookPiece(dir)

		spies.getPathForCover = vi.spyOn(bookPiece, 'getRelativeCoverPath').mockReturnValue(coverPath)
		spies.downloadCover = vi.spyOn(bookPiece, 'downloadCover').mockResolvedValue(true)
		spies.get = vi.spyOn(bookPiece, 'get').mockResolvedValue(bookMd)
		spies.write = vi.spyOn(bookPiece, 'write').mockResolvedValue()

		await bookPiece.attach(slug, coverUrl)

		expect(spies.downloadCover).toHaveBeenCalledWith(slug, coverUrl)
		expect(spies.write).toHaveBeenCalledWith(slug, {
			...bookMd,
			frontmatter: { ...bookMd.frontmatter, cover_path: coverPath },
		})
	})

	test('attach throws', async () => {
		const slug = 'b'
		const dir = 'dir'
		const coverUrl = 'https://somewhere'
		const coverPath = '.assets/cover/slug.jpg'

		mocks.BookPieceDirectories.mockReturnValue({ assets: '/path/to/.assets' } as PieceDirectories)

		const bookPiece = new BookPiece(dir)

		spies.getPathForCover = vi.spyOn(bookPiece, 'getCoverPath').mockReturnValue(coverPath)
		spies.downloadCover = vi.spyOn(bookPiece, 'downloadCover').mockResolvedValue(true)
		spies.get = vi.spyOn(bookPiece, 'get').mockResolvedValue(null)

		const attaching = bookPiece.attach(slug, coverUrl)

		expect(attaching).rejects.toThrowError()
	})
})
