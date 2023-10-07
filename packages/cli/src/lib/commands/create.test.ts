import log from '../log.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { CreateArgv } from './create.js'
import { Arguments } from 'yargs'
import { makeBookMarkDown } from '../books/book.fixtures.js'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'
import { BookPiece } from '../books/index.js'

vi.mock('../books/index')

const mocks = {
	logInfo: vi.spyOn(log, 'info'),
	logError: vi.spyOn(log, 'error'),
	logChild: vi.spyOn(log, 'child'),
	BookPieceCreate: vi.spyOn(BookPiece.prototype, 'create'),
	BookPieceWrite: vi.spyOn(BookPiece.prototype, 'write'),
	BookPieceExists: vi.spyOn(BookPiece.prototype, 'exists'),
}

const spies: { [key: string]: SpyInstance } = {}

describe('tools/lib/commands/create', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('run', async () => {
		const ctx = makeContext()
		const book = makeBookMarkDown()
		const title = 'slug2'
		const piece = 'books'

		mocks.BookPieceCreate.mockResolvedValueOnce(book)
		mocks.BookPieceWrite.mockResolvedValueOnce()
		mocks.BookPieceExists.mockReturnValueOnce(false)

		await command.run(ctx, { title, piece } as Arguments<CreateArgv>)

		expect(mocks.BookPieceWrite).toHaveBeenCalledOnce()
		expect(mocks.BookPieceCreate).toHaveBeenCalledOnce()
	})

	test('run errors on existing piece', async () => {
		const ctx = makeContext()
		const book = makeBookMarkDown()
		const title = 'slug2'
		const piece = 'books'

		mocks.BookPieceCreate.mockResolvedValueOnce(book)
		mocks.BookPieceWrite.mockResolvedValueOnce()
		mocks.BookPieceExists.mockReturnValueOnce(true)

		await command.run(ctx, { title, piece } as Arguments<CreateArgv>)

		expect(mocks.BookPieceWrite).not.toHaveBeenCalledOnce()
		expect(mocks.BookPieceCreate).not.toHaveBeenCalledOnce()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('run with dry-run', async () => {
		const ctx = makeContext({ flags: { dryRun: true } })
		const book = makeBookMarkDown()
		const title = 'slug2'
		const piece = 'books'

		mocks.BookPieceCreate.mockResolvedValueOnce(book)
		mocks.BookPieceWrite.mockResolvedValueOnce()
		mocks.BookPieceExists.mockReturnValueOnce(false)

		await command.run(ctx, { title, piece } as Arguments<CreateArgv>)

		expect(mocks.BookPieceWrite).not.toHaveBeenCalledOnce()
		expect(mocks.BookPieceCreate).not.toHaveBeenCalledOnce()
	})

	test('builder', async () => {
		const args = yargs()

		spies.positional = vi.spyOn(args, 'positional')
		command.builder?.(args)

		expect(spies.positional).toHaveBeenCalledOnce()
	})
})
