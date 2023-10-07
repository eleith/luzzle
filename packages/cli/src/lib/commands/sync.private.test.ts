import log from '../log.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import {
	makeBookMarkDown,
	makeBook,
	makeBookCreateInput,
	makeBookUpdateInput,
} from '../../pieces/books/book.fixtures.js'
import { makeContext } from './context.fixtures.js'
import { syncAddBook, syncUpdateBook, syncRemoveBooks } from './sync.private.js'
import { addTagsTo, removeAllTagsFrom, syncTagsFor, keywordsToTags } from '../tags/index.js'
import { mockDatabase } from '../database.mock.js'
import { BookPiece } from '../../pieces/books/index.js'

vi.mock('../log.js')
vi.mock('../tags/index')
vi.mock('../../pieces/books/index')

const mocks = {
	logInfo: vi.spyOn(log, 'info'),
	logError: vi.spyOn(log, 'error'),
	logChild: vi.spyOn(log, 'child'),
	BookPieceSlugs: vi.spyOn(BookPiece.prototype, 'getSlugsUpdated'),
	BookPieceGet: vi.spyOn(BookPiece.prototype, 'get'),
	BookPieceToUpdate: vi.spyOn(BookPiece.prototype, 'toUpdateInput'),
	BookPieceToCreate: vi.spyOn(BookPiece.prototype, 'toCreateInput'),
	addTagsTo: vi.mocked(addTagsTo),
	removeAllTagsFrom: vi.mocked(removeAllTagsFrom),
	syncTagsFor: vi.mocked(syncTagsFor),
	keywordsToTags: vi.mocked(keywordsToTags),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/sync.private', () => {
	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})

		Object.keys(spies).forEach((key) => {
			spies[key].mockRestore()
			delete spies[key]
		})
	})

	test('syncAddBook', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const bookMd = makeBookMarkDown()
		const input = makeBookCreateInput()
		const slug = 'slug1'
		const book = makeBook({ slug })
		const piece = new BookPiece(ctx.directory)

		kysely.queries.executeTakeFirst.mockResolvedValueOnce(null)
		kysely.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(book)

		mocks.BookPieceToCreate.mockResolvedValueOnce(input)

		await syncAddBook(ctx, slug, piece, bookMd)

		expect(mocks.BookPieceToCreate).toHaveBeenCalledOnce()
		expect(mocks.BookPieceToUpdate).not.toHaveBeenCalled()
		expect(kysely.queries.values).toHaveBeenCalledWith(input)
	})

	test('syncAddBook with keywords', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const bookMd = makeBookMarkDown()
		const input = makeBookCreateInput()
		const slug = 'slug1'
		const keywords = 'one,two'
		const book = makeBook({ slug, keywords })
		const piece = new BookPiece(ctx.directory)

		kysely.queries.executeTakeFirst.mockResolvedValueOnce(null)
		kysely.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(book)

		mocks.BookPieceToCreate.mockResolvedValueOnce(input)
		mocks.addTagsTo.mockResolvedValueOnce(undefined)
		mocks.keywordsToTags.mockReturnValueOnce([])

		await syncAddBook(ctx, slug, piece, bookMd)

		expect(mocks.BookPieceToCreate).toHaveBeenCalledOnce()
		expect(mocks.BookPieceToUpdate).not.toHaveBeenCalled()
		expect(mocks.keywordsToTags).toHaveBeenCalledWith(keywords)
		expect(mocks.addTagsTo).toHaveBeenCalledOnce()
	})

	test('syncAddBook already exists', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const bookMd = makeBookMarkDown()
		const update = makeBookUpdateInput()
		const slug = 'slug1'
		const book = makeBook({ slug })
		const piece = new BookPiece(ctx.directory)

		kysely.queries.executeTakeFirst.mockResolvedValueOnce(book)
		kysely.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(book)

		mocks.BookPieceToUpdate.mockResolvedValueOnce(update)

		await syncAddBook(ctx, slug, piece, bookMd)

		expect(mocks.BookPieceToUpdate).toHaveBeenCalledOnce()
		expect(mocks.BookPieceToCreate).not.toHaveBeenCalled()
	})

	test('syncAddBook with flag dry-run', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ flags: { dryRun: true }, db: kysely.db })
		const bookMd = makeBookMarkDown()
		const input = makeBookCreateInput()
		const slug = 'slug1'
		const piece = new BookPiece(ctx.directory)

		mocks.BookPieceToCreate.mockResolvedValueOnce(input)

		await syncAddBook(ctx, slug, piece, bookMd)

		expect(mocks.BookPieceToCreate).not.toHaveBeenCalledOnce()
		expect(mocks.BookPieceToUpdate).not.toHaveBeenCalled()
	})

	test('syncAddBook catches error', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const bookMd = makeBookMarkDown()
		const input = makeBookCreateInput()
		const slug = 'slug1'
		const piece = new BookPiece(ctx.directory)

		kysely.queries.executeTakeFirstOrThrow.mockRejectedValueOnce(new Error('test'))

		mocks.BookPieceToCreate.mockResolvedValueOnce(input)
		mocks.logError.mockResolvedValueOnce()

		await syncAddBook(ctx, slug, piece, bookMd)

		expect(mocks.BookPieceToCreate).toHaveBeenCalledOnce()
		expect(mocks.BookPieceToUpdate).not.toHaveBeenCalled()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('syncUpdateBook', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const bookMd = makeBookMarkDown()
		const update = makeBookUpdateInput()
		const slug = 'slug1'
		const book = makeBook({ slug })
		const piece = new BookPiece(ctx.directory)

		kysely.queries.executeTakeFirst.mockResolvedValueOnce(book)
		kysely.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(book)

		mocks.BookPieceToUpdate.mockResolvedValueOnce(update)

		await syncUpdateBook(ctx, slug, piece, bookMd)

		expect(mocks.BookPieceToUpdate).toHaveBeenCalledOnce()
	})

	test('syncUpdateBook with force', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const bookMd = makeBookMarkDown()
		const update = makeBookUpdateInput()
		const slug = 'slug1'
		const book = makeBook({ slug })
		const piece = new BookPiece(ctx.directory)

		kysely.queries.executeTakeFirst.mockResolvedValueOnce(book)
		kysely.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(book)

		mocks.BookPieceToUpdate.mockResolvedValueOnce(update)

		await syncUpdateBook(ctx, slug, piece, bookMd, true)

		expect(mocks.BookPieceToUpdate).toHaveBeenCalledWith(slug, bookMd, book, true)
	})

	test('syncUpdateBook with keywords', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const bookMd = makeBookMarkDown()
		const keywords = 'one,two'
		const update = makeBookUpdateInput({ keywords })
		const slug = 'slug1'
		const book = makeBook({ slug, keywords })
		const piece = new BookPiece(ctx.directory)

		kysely.queries.executeTakeFirst.mockResolvedValueOnce(book)
		kysely.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(book)

		mocks.BookPieceToUpdate.mockResolvedValueOnce(update)
		mocks.syncTagsFor.mockResolvedValue(undefined)

		await syncUpdateBook(ctx, slug, piece, bookMd)

		expect(mocks.BookPieceToUpdate).toHaveBeenCalledOnce()
		expect(mocks.syncTagsFor).toHaveBeenCalledOnce()
	})

	test('syncUpdateBook with flag dry-run', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ flags: { dryRun: true }, db: kysely.db })
		const bookMd = makeBookMarkDown()
		const update = makeBookUpdateInput()
		const slug = 'slug1'
		const piece = new BookPiece(ctx.directory)

		mocks.BookPieceToUpdate.mockResolvedValueOnce(update)

		await syncUpdateBook(ctx, slug, piece, bookMd)

		expect(mocks.BookPieceToUpdate).not.toHaveBeenCalledOnce()
	})

	test('syncUpdateBook catches error', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const bookMd = makeBookMarkDown()
		const update = makeBookUpdateInput()
		const slug = 'slug1'
		const book = makeBook({ slug })
		const piece = new BookPiece(ctx.directory)

		kysely.queries.executeTakeFirst.mockResolvedValueOnce(book)
		kysely.queries.executeTakeFirstOrThrow.mockRejectedValueOnce(new Error('test'))

		mocks.BookPieceToUpdate.mockResolvedValueOnce(update)

		await syncUpdateBook(ctx, slug, piece, bookMd)

		expect(mocks.BookPieceToUpdate).toHaveBeenCalledOnce()
		expect(mocks.logError).toHaveBeenCalledOnce()
	})

	test('syncRemoveBooks', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const slug = 'slug1'
		const book = makeBook({ slug })

		kysely.queries.execute.mockResolvedValueOnce([book])
		mocks.removeAllTagsFrom.mockResolvedValueOnce(undefined)

		await syncRemoveBooks(ctx, [])

		expect(mocks.removeAllTagsFrom).toHaveBeenCalledOnce()
	})

	test('syncRemoveBook with flag dry-flag', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ flags: { dryRun: true }, db: kysely.db })
		const slug = 'slug1'
		const book = makeBook({ slug })

		kysely.queries.execute.mockResolvedValueOnce([book])

		await syncRemoveBooks(ctx, [])

		expect(kysely.queries.execute).toHaveBeenCalledOnce()
	})

	test('syncRemoveBook catches error', async () => {
		const kysely = mockDatabase()
		const ctx = makeContext({ db: kysely.db })
		const slug = 'slug1'
		const book = makeBook({ slug })

		kysely.queries.execute.mockResolvedValueOnce([book])
		kysely.queries.execute.mockRejectedValueOnce(new Error('test'))

		await syncRemoveBooks(ctx, [])

		expect(mocks.logError).toHaveBeenCalledOnce()
	})
})
