import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { SyncArgv } from './sync.js'
import yargs, { Arguments } from 'yargs'
import { makeBookMarkDown } from '../books/book.fixtures.js'
import { makeContext } from './context.fixtures.js'
import { syncAddBook, syncRemoveBooks, syncUpdateBook } from './sync.private.js'
import CacheForType from '../cache.js'
import { BookPiece } from '../books/index.js'
import { PieceCache } from '../pieces/cache.js'
import { PieceDatabase } from '../pieces/piece.js'

vi.mock('./sync.private')
vi.mock('../books/index')

const mocks = {
	syncAddBook: vi.mocked(syncAddBook),
	syncRemoveBooks: vi.mocked(syncRemoveBooks),
	syncUpdateBook: vi.mocked(syncUpdateBook),
	BookPieceSlugsUpdated: vi.spyOn(BookPiece.prototype, 'getSlugsUpdated'),
	BookPieceSlugs: vi.spyOn(BookPiece.prototype, 'getSlugs'),
	BookPieceGet: vi.spyOn(BookPiece.prototype, 'get'),
	BookPieceCache: vi.spyOn(BookPiece.prototype, 'caches', 'get'),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/sync', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('sync adds 2 books to db', async () => {
		const ctx = makeContext()
		const slugs = ['a', 'b']
		const bookMd = makeBookMarkDown()
		const cache = {
			get: () => ({ database: null }),
		} as unknown as CacheForType<PieceCache<PieceDatabase>>

		mocks.BookPieceSlugsUpdated.mockResolvedValueOnce(slugs)
		mocks.BookPieceGet.mockResolvedValue(bookMd)
		mocks.BookPieceCache.mockReturnValue(cache)
		mocks.syncRemoveBooks.mockResolvedValue()
		mocks.syncAddBook.mockResolvedValue()

		await command.run(ctx, {} as Arguments<SyncArgv>)

		expect(mocks.BookPieceGet).toHaveBeenCalledTimes(slugs.length)
		expect(mocks.syncRemoveBooks).toHaveBeenCalled()
		expect(mocks.syncAddBook).toHaveBeenCalledTimes(slugs.length)
		expect(mocks.syncUpdateBook).not.toHaveBeenCalled()
	})

	test('sync update 2 books to db', async () => {
		const ctx = makeContext()
		const slugs = ['a', 'b']
		const bookMd = makeBookMarkDown()
		const cache = {
			get: () => ({ database: { slug: slugs[0] } }),
		} as unknown as CacheForType<PieceCache<PieceDatabase>>

		mocks.BookPieceSlugsUpdated.mockResolvedValueOnce(slugs)
		mocks.BookPieceGet.mockResolvedValue(bookMd)
		mocks.BookPieceCache.mockReturnValue(cache)
		mocks.syncRemoveBooks.mockResolvedValue()
		mocks.syncUpdateBook.mockResolvedValue()

		await command.run(ctx, {} as Arguments<SyncArgv>)

		expect(mocks.BookPieceGet).toHaveBeenCalledTimes(slugs.length)
		expect(mocks.syncRemoveBooks).toHaveBeenCalled()
		expect(mocks.syncUpdateBook).toHaveBeenCalledTimes(slugs.length)
		expect(mocks.syncAddBook).not.toHaveBeenCalled()
	})

	test('sync with flag force', async () => {
		const ctx = makeContext()
		const slugs = ['a', 'b']
		const bookMd = makeBookMarkDown()
		const cache = {
			get: () => ({ database: { slug: slugs[0] } }),
		} as unknown as CacheForType<PieceCache<PieceDatabase>>

		mocks.BookPieceSlugs.mockResolvedValueOnce(slugs)
		mocks.BookPieceGet.mockResolvedValue(bookMd)
		mocks.BookPieceCache.mockReturnValue(cache)
		mocks.syncRemoveBooks.mockResolvedValue()
		mocks.syncUpdateBook.mockResolvedValue()

		await command.run(ctx, { force: true } as Arguments<SyncArgv>)

		expect(mocks.BookPieceGet).toHaveBeenCalledTimes(slugs.length)
		expect(mocks.syncRemoveBooks).toHaveBeenCalled()
		expect(mocks.syncUpdateBook).toHaveBeenCalledTimes(slugs.length)
		expect(mocks.syncAddBook).not.toHaveBeenCalled()
	})

	test('builder', async () => {
		const args = yargs()

		spies.options = vi.spyOn(args, 'options')
		command.builder?.(args)

		expect(spies.options).toHaveBeenCalledOnce()
	})
})
