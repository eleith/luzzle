import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command from './dump.js'
import { Arguments } from 'yargs'
import { makeBook, makeBookMarkDown } from '../books/book.fixtures.js'
import { makeContext } from './context.fixtures.js'
import { CpuInfo, cpus } from 'os'
import log from '../log.js'
import { mockDatabase } from '../database.mock.js'
import { BookPiece } from '../books/index.js'

vi.mock('os')
vi.mock('log')
vi.mock('../books/index')

const mocks = {
	logError: vi.spyOn(log, 'error'),
	BookPieceWrite: vi.spyOn(BookPiece.prototype, 'write'),
	BookPieceToMd: vi.spyOn(BookPiece.prototype, 'toMarkDown'),
	cpus: vi.mocked(cpus),
}

const spies: SpyInstance[] = []

describe('lib/commands/dump', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		spies.map((spy) => {
			spy.mockRestore()
		})
	})

	test('dump', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const books = [makeBook(), makeBook(), makeBook()]
		const bookMd = makeBookMarkDown()

		kysely.queries.execute.mockResolvedValueOnce(books)
		mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
		mocks.BookPieceToMd.mockResolvedValueOnce(bookMd)
		mocks.BookPieceWrite.mockResolvedValueOnce()

		await command.run(ctx, {} as Arguments)

		expect(mocks.BookPieceToMd).toHaveBeenCalledTimes(3)
		expect(mocks.BookPieceWrite).toHaveBeenCalledTimes(3)
	})

	test('dump with flag dry-run', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ flags: { dryRun: true }, db: kysely.db })
		const books = [makeBook(), makeBook(), makeBook()]
		const bookMd = makeBookMarkDown()

		kysely.queries.execute.mockResolvedValueOnce(books)
		mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
		mocks.BookPieceToMd.mockResolvedValueOnce(bookMd)
		mocks.BookPieceWrite.mockResolvedValueOnce()

		await command.run(ctx, {} as Arguments)

		expect(mocks.BookPieceWrite).not.toHaveBeenCalled()
	})

	test('dump with error', async () => {
		const kyselyMock = mockDatabase()
		const ctx = makeContext({ db: kyselyMock.db })
		const books = [makeBook()]
		const bookMd = makeBookMarkDown()

		kyselyMock.queries.execute.mockResolvedValueOnce(books)
		mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
		mocks.BookPieceToMd.mockResolvedValueOnce(bookMd)
		mocks.BookPieceWrite.mockRejectedValueOnce(new Error('error'))

		await command.run(ctx, {} as Arguments)

		expect(mocks.BookPieceWrite).toHaveBeenCalled()
		expect(mocks.logError).toHaveBeenCalled()
	})
})
