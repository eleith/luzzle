import {
	completeOpenAI,
	getBook,
	searchGoogleBooks,
	searchOpenLibrary,
	writeBookMd,
} from '../books/index.js'
import log from '../log.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { FetchArgv } from './fetch.js'
import { Arguments } from 'yargs'
import { makeBookMd } from '../books/book.fixtures.js'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { merge } from 'lodash-es'

vi.mock('../books')
vi.mock('../log')

const mocks = {
	logInfo: vi.spyOn(log, 'info'),
	logWarn: vi.spyOn(log, 'warn'),
	getBook: vi.mocked(getBook),
	writeBookMd: vi.mocked(writeBookMd),
	searchGoogleBooks: vi.mocked(searchGoogleBooks),
	searchOpenLibrary: vi.mocked(searchOpenLibrary),
	completeOpenAI: vi.mocked(completeOpenAI),
}

const spies: SpyInstance[] = []

describe('lib/commands/fetch', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		spies.forEach((spy) => {
			spy.mockRestore()
		})
	})

	test('run with slug', async () => {
		const ctx = makeContext({ config: { get: () => ({}) } })
		const book = makeBookMd()
		const slug = 'slug2'

		mocks.getBook.mockResolvedValueOnce(book)
		mocks.writeBookMd.mockResolvedValueOnce()

		await command.run(ctx, { slug, service: 'all' } as Arguments<FetchArgv>)

		expect(mocks.getBook).toHaveBeenCalledOnce()
		expect(mocks.writeBookMd).toHaveBeenCalledOnce()
		expect(mocks.logWarn).toHaveBeenCalledTimes(3)
	})

	test('run with google', async () => {
		const ctx = makeContext({ config: { get: () => ({ google: 'abc' }) } })
		const book = makeBookMd()
		const bookGoogle = makeBookMd({ frontmatter: { description: 'a tiny desc' } })
		const slug = 'slug2'

		mocks.getBook.mockResolvedValueOnce(book)
		mocks.writeBookMd.mockResolvedValueOnce()
		mocks.searchGoogleBooks.mockResolvedValueOnce(bookGoogle.frontmatter)

		await command.run(ctx, { slug, service: 'google' } as Arguments<FetchArgv>)

		expect(mocks.getBook).toHaveBeenCalledOnce()
		expect(mocks.writeBookMd).toHaveBeenCalledWith(expect.anything(), merge(book, bookGoogle))
		expect(mocks.searchGoogleBooks).toHaveBeenCalledWith(
			'abc',
			book.frontmatter.title,
			book.frontmatter.author
		)
	})

	test('run with openai', async () => {
		const ctx = makeContext({ config: { get: () => ({ openai: 'abc' }) } })
		const book = makeBookMd()
		const bookGoogle = makeBookMd({ frontmatter: { description: 'a tiny desc' } })
		const slug = 'slug2'

		mocks.getBook.mockResolvedValueOnce(book)
		mocks.writeBookMd.mockResolvedValueOnce()
		mocks.completeOpenAI.mockResolvedValueOnce(bookGoogle.frontmatter)

		await command.run(ctx, { slug, service: 'openai' } as Arguments<FetchArgv>)

		expect(mocks.getBook).toHaveBeenCalledOnce()
		expect(mocks.writeBookMd).toHaveBeenCalledWith(expect.anything(), merge(book, bookGoogle))
		expect(mocks.completeOpenAI).toHaveBeenCalledOnce()
	})

	test('run with openlibrary', async () => {
		const ctx = makeContext({ config: { get: () => ({}) } })
		const book = makeBookMd({ frontmatter: { id_ol_book: 'abc' } })
		const bookOpenLibrary = makeBookMd({ frontmatter: { description: 'a tiny desc' } })
		const slug = 'slug2'

		mocks.getBook.mockResolvedValueOnce(book)
		mocks.writeBookMd.mockResolvedValueOnce()
		mocks.searchOpenLibrary.mockResolvedValueOnce(bookOpenLibrary.frontmatter)

		await command.run(ctx, { slug, service: 'openlibrary' } as Arguments<FetchArgv>)

		expect(mocks.getBook).toHaveBeenCalledOnce()
		expect(mocks.writeBookMd).toHaveBeenCalledWith(expect.anything(), merge(book, bookOpenLibrary))
		expect(mocks.searchOpenLibrary).toHaveBeenCalledWith(
			expect.anything(),
			book.frontmatter.id_ol_book,
			slug,
			book.frontmatter.title,
			book.frontmatter.author
		)
	})

	test('run with dry-run', async () => {
		const ctx = makeContext({ flags: { dryRun: true } })
		const book = makeBookMd()
		const slug = 'slug2'

		mocks.getBook.mockResolvedValueOnce(book)
		mocks.writeBookMd.mockResolvedValueOnce()

		await command.run(ctx, { slug } as Arguments<FetchArgv>)

		expect(mocks.getBook).toHaveBeenCalledOnce()
		expect(mocks.writeBookMd).not.toHaveBeenCalled()
	})

	test('run does not find slug', async () => {
		const ctx = makeContext()
		const slug = 'slug2'

		mocks.getBook.mockResolvedValueOnce(null)
		mocks.writeBookMd.mockResolvedValueOnce()

		await command.run(ctx, { slug } as Arguments<FetchArgv>)

		expect(mocks.getBook).toHaveBeenCalledOnce()
		expect(mocks.writeBookMd).not.toHaveBeenCalled()
	})

	test('builder', async () => {
		const args = yargs()

		const spyPositional = vi.spyOn(args, 'positional')
		const spyOption = vi.spyOn(args, 'option')

		command.builder?.(args)

		spies.push(spyPositional, spyOption)

		expect(spyPositional).toHaveBeenCalledTimes(2)
		expect(spyOption).toHaveBeenCalledTimes(3)
	})
})
