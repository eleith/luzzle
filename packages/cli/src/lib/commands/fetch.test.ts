import log from '../log.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { FetchArgv } from './fetch.js'
import { Arguments, Argv } from 'yargs'
import { makeBookMarkDown } from '../books/book.fixtures.js'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { merge } from 'lodash-es'
import { Pieces } from '../pieces/index.js'
import { BookPiece } from '../books/index.js'

vi.mock('../books')
vi.mock('../log')
vi.mock('../pieces')
vi.mock('../books/index')

const mocks = {
	logInfo: vi.spyOn(log, 'info'),
	logWarn: vi.spyOn(log, 'warn'),
	piecesParseArgs: vi.spyOn(Pieces, 'parseArgv'),
	piecesCommand: vi.spyOn(Pieces, 'command'),
	BookPieceGet: vi.spyOn(BookPiece.prototype, 'get'),
	BookPieceSearchOpenLibrary: vi.spyOn(BookPiece.prototype, 'searchOpenLibrary'),
	BookPieceSearchGoogleBooks: vi.spyOn(BookPiece.prototype, 'searchGoogleBooks'),
	BookPieceCompleteOpenAI: vi.spyOn(BookPiece.prototype, 'completeOpenAI'),
	BookPieceWrite: vi.spyOn(BookPiece.prototype, 'write'),
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
		const book = makeBookMarkDown()
		const path = 'slug2'

		mocks.BookPieceGet.mockResolvedValueOnce(book)
		mocks.BookPieceWrite.mockResolvedValueOnce()
		mocks.piecesParseArgs.mockReturnValueOnce({ slug: path, piece: 'books' })

		await command.run(ctx, { path, service: 'all' } as Arguments<FetchArgv>)

		expect(mocks.BookPieceWrite).toHaveBeenCalledOnce()
		expect(mocks.logWarn).toHaveBeenCalledTimes(3)
	})

	test('run with google', async () => {
		const ctx = makeContext({ config: { get: () => ({ google: 'abc' }) } })
		const book = makeBookMarkDown()
		const bookGoogle = makeBookMarkDown({ frontmatter: { description: 'a tiny desc' } })
		const path = 'slug2'

		mocks.BookPieceGet.mockResolvedValueOnce(book)
		mocks.BookPieceSearchGoogleBooks.mockResolvedValueOnce(bookGoogle.frontmatter)
		mocks.BookPieceWrite.mockResolvedValueOnce()
		mocks.piecesParseArgs.mockReturnValueOnce({ slug: path, piece: 'books' })

		await command.run(ctx, { path, service: 'google' } as Arguments<FetchArgv>)

		expect(mocks.BookPieceWrite).toHaveBeenCalledWith(expect.anything(), merge(book, bookGoogle))
		expect(mocks.BookPieceSearchGoogleBooks).toHaveBeenCalledWith(
			'abc',
			book.frontmatter.title,
			book.frontmatter.author
		)
	})

	test('run with openai', async () => {
		const ctx = makeContext({ config: { get: () => ({ openai: 'abc' }) } })
		const book = makeBookMarkDown()
		const bookAi = makeBookMarkDown({ frontmatter: { description: 'a tiny desc' } })
		const path = 'slug2'

		mocks.BookPieceGet.mockResolvedValueOnce(book)
		mocks.BookPieceCompleteOpenAI.mockResolvedValueOnce(bookAi.frontmatter)
		mocks.BookPieceWrite.mockResolvedValueOnce()
		mocks.piecesParseArgs.mockReturnValueOnce({ slug: path, piece: 'books' })

		await command.run(ctx, { path, service: 'openai' } as Arguments<FetchArgv>)

		expect(mocks.BookPieceWrite).toHaveBeenCalledWith(expect.anything(), merge(book, bookAi))
		expect(mocks.BookPieceCompleteOpenAI).toHaveBeenCalledOnce()
	})

	test('run with openlibrary', async () => {
		const ctx = makeContext({ config: { get: () => ({}) } })
		const book = makeBookMarkDown({ frontmatter: { id_ol_book: 'abc' } })
		const bookOpenLibrary = makeBookMarkDown({ frontmatter: { description: 'a tiny desc' } })
		const path = 'slug2'

		mocks.BookPieceGet.mockResolvedValueOnce(book)
		mocks.BookPieceWrite.mockResolvedValueOnce()
		mocks.BookPieceSearchOpenLibrary.mockResolvedValueOnce(bookOpenLibrary.frontmatter)
		mocks.piecesParseArgs.mockReturnValueOnce({ slug: path, piece: 'books' })

		await command.run(ctx, { path, service: 'openlibrary' } as Arguments<FetchArgv>)

		expect(mocks.BookPieceWrite).toHaveBeenCalledWith(
			expect.anything(),
			merge(book, bookOpenLibrary)
		)
		expect(mocks.BookPieceSearchOpenLibrary).toHaveBeenCalledWith(
			book.frontmatter.id_ol_book,
			path,
			book.frontmatter.title,
			book.frontmatter.author
		)
	})

	test('run with dry-run', async () => {
		const ctx = makeContext({ flags: { dryRun: true } })
		const book = makeBookMarkDown()
		const path = 'slug2'

		mocks.BookPieceGet.mockResolvedValueOnce(book)
		mocks.BookPieceWrite.mockResolvedValueOnce()
		mocks.piecesParseArgs.mockReturnValueOnce({ slug: path, piece: 'books' })

		await command.run(ctx, { path } as Arguments<FetchArgv>)

		expect(mocks.BookPieceGet).toHaveBeenCalledOnce()
		expect(mocks.BookPieceWrite).not.toHaveBeenCalled()
	})

	test('run does not find slug', async () => {
		const ctx = makeContext()
		const path = 'slug2'

		mocks.BookPieceGet.mockResolvedValueOnce(null)
		mocks.BookPieceWrite.mockResolvedValueOnce()
		mocks.piecesParseArgs.mockReturnValueOnce({ slug: path, piece: 'books' })

		await command.run(ctx, { path } as Arguments<FetchArgv>)

		expect(mocks.BookPieceGet).toHaveBeenCalledOnce()
		expect(mocks.BookPieceWrite).not.toHaveBeenCalled()
	})

	test('builder', async () => {
		const args = yargs() as Argv<FetchArgv>
		const spyPositional = vi.spyOn(args, 'positional')
		const spyOption = vi.spyOn(args, 'option')

		mocks.piecesCommand.mockReturnValueOnce(args)

		command.builder?.(args)

		spies.push(spyPositional, spyOption)

		expect(mocks.piecesCommand).toHaveBeenCalledOnce()
		expect(spyOption).toHaveBeenCalledWith('service', expect.any(Object))
	})
})
