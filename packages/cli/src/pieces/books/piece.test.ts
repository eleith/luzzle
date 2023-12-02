import { existsSync } from 'fs'
import { copyFile, stat, unlink, writeFile } from 'fs/promises'
import * as bookFixtures from './book.fixtures.js'
import * as openLibraryFixtures from './open-library.fixtures.js'
import * as googleBooksFixtures from './google-books.fixtures.js'
import { findVolume } from './google-books.js'
import { generateTags, generateDescription } from './openai.js'
import log from '../../lib/log.js'
import { addFrontMatter, extract } from '../../lib/md.js'
import { findWork, getBook, getCoverUrl } from './open-library.js'
import { downloadToTmp } from '../../lib/web.js'
import { fileTypeFromFile } from 'file-type'
import { describe, expect, test, vi, afterEach, beforeEach, SpyInstance } from 'vitest'
import { cpus } from 'os'
import BookPiece from './piece.js'
import { toValidatedMarkdown } from '../../lib/pieces/index.js'
import { mockConfig } from '../../lib/config.mock.js'

vi.mock('file-type')
vi.mock('fs')
vi.mock('fs/promises')
vi.mock('../../lib/web')
vi.mock('./open-library')
vi.mock('./google-books')
vi.mock('./openai')
vi.mock('../../lib/md')
vi.mock('os')
vi.mock('../../lib/log')
vi.mock('../../lib/pieces/index.js')
vi.mock('@luzzle/kysely')

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
	fromFile: vi.mocked(fileTypeFromFile),
	writeFile: vi.mocked(writeFile),
	existSync: vi.mocked(existsSync),
	generateTags: vi.mocked(generateTags),
	generateDescription: vi.mocked(generateDescription),
	BookPieceGetFileName: vi.spyOn(BookPiece.prototype, 'getFileName'),
	toMarkdown: vi.mocked(toValidatedMarkdown),
	fileTypeFromFile: vi.mocked(fileTypeFromFile),
}

const spies: Record<string, SpyInstance> = {}

describe('pieces/books/piece', () => {
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

	test('searchOpenLibrary', async () => {
		const workId = 'work-id'
		const bookId = 'book-id'
		const slug = 'b'
		const book = openLibraryFixtures.makeOpenLibraryBook({ works: [{ key: `/works/${workId}` }] })
		const work = openLibraryFixtures.makeOpenLibrarySearchWork({ cover_i: undefined })
		const bookMd = bookFixtures.makeBookMarkDown({ frontmatter: { id_ol_book: bookId } })

		mocks.getBook.mockResolvedValueOnce(book)
		mocks.findWork.mockResolvedValueOnce(work)

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
		const bookMd = bookFixtures.makeBookMarkDown({
			frontmatter: { id_ol_book: bookId },
		})
		const tmpFile = 'tmp/file'

		mocks.getBook.mockResolvedValueOnce(book)
		mocks.findWork.mockResolvedValueOnce(work)
		mocks.getCoverUrl.mockReturnValue(coverUrl)
		mocks.downloadTo.mockResolvedValue(tmpFile)
		mocks.unlink.mockResolvedValue()

		const bookPiece = new BookPiece('root')

		spies.attach = vi.spyOn(bookPiece, 'attach').mockResolvedValueOnce(bookMd)

		await bookPiece.searchOpenLibrary(
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
		expect(spies.attach).toHaveBeenCalledWith(
			tmpFile,
			{
				slug,
				note: '',
				frontmatter: {
					title: work.title,
					author: work.author_name[0],
					coauthors: work.author_name[1],
					id_ol_work: workId,
					isbn: work.isbn?.[0],
					subtitle: book.subtitle,
					pages: Number(work.number_of_pages),
					year_first_published: work.first_publish_year,
				},
			},
			'cover'
		)
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
		const markdown = bookFixtures.makeBookMarkDown()
		const tags = ['tag1', 'tag2']
		const description = 'a tiny description'

		mocks.generateDescription.mockResolvedValueOnce(description)
		mocks.generateTags.mockResolvedValueOnce(tags)

		const details = await new BookPiece('root').completeOpenAI(openAIKey, markdown)

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

	test('create', () => {
		const slug = 'slug'
		const title = 'title'
		const markdown = bookFixtures.makeBookMarkDown()

		mocks.toMarkdown.mockReturnValueOnce(markdown)

		const bookPiece = new BookPiece('root')

		bookPiece.create(slug, title)

		expect(mocks.toMarkdown).toHaveBeenCalledOnce()
	})
})
