import log from '../log.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import {
  makeBookMd,
  makeBook,
  makeBookCreateInput,
  makeBookUpdateInput,
} from '../books/book.fixtures.js'
import { makeContext } from './context.fixtures.js'
import {
  getBook,
  bookMdToBookUpdateInput,
  bookMdToBookCreateInput,
  getSlugFromBookMd,
  getUpdatedSlugs,
} from '../books/index.js'
import { syncAddBook, syncUpdateBook, syncRemoveBooks } from './sync.private.js'
import { makeBooks } from '../books/books.mock.js'
import { addTagsTo, removeAllTagsFrom, syncTagsFor, keywordsToTags } from '../tags/index.js'
import { mockDatabase } from '../database.mock.js'

vi.mock('../books')
vi.mock('../tags')

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logChild: vi.spyOn(log, 'child'),
  getUpdatedSlugs: vi.mocked(getUpdatedSlugs),
  getBook: vi.mocked(getBook),
  bookMdToBookUpdateInput: vi.mocked(bookMdToBookUpdateInput),
  bookMdToBookCreateInput: vi.mocked(bookMdToBookCreateInput),
  getSlugFromBookMd: vi.mocked(getSlugFromBookMd),
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
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })
    const books = makeBooks()

    kysely.queries.executeTakeFirst.mockResolvedValueOnce(null)
    kysely.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(book)

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)

    await syncAddBook(ctx, books, bookMd)

    expect(mocks.bookMdToBookCreateInput).toHaveBeenCalledOnce()
    expect(mocks.getSlugFromBookMd).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalled()
    expect(kysely.queries.values).toHaveBeenCalledWith(input)
  })

  test('syncAddBook with keywords', async () => {
    const kysely = mockDatabase()
    const ctx = makeContext({ db: kysely.db })
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const keywords = 'one,two'
    const book = makeBook({ slug, keywords })
    const books = makeBooks()

    kysely.queries.executeTakeFirst.mockResolvedValueOnce(null)
    kysely.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(book)

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)
    mocks.addTagsTo.mockResolvedValueOnce(undefined)
    mocks.keywordsToTags.mockReturnValueOnce([])

    await syncAddBook(ctx, books, bookMd)

    expect(mocks.bookMdToBookCreateInput).toHaveBeenCalledOnce()
    expect(mocks.getSlugFromBookMd).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalled()
    expect(mocks.keywordsToTags).toHaveBeenCalledWith(keywords)
    expect(mocks.addTagsTo).toHaveBeenCalledOnce()
  })

  test('syncAddBook already exists', async () => {
    const kysely = mockDatabase()
    const ctx = makeContext({ db: kysely.db })
    const bookMd = makeBookMd()
    const update = makeBookUpdateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })
    const books = makeBooks()

    kysely.queries.executeTakeFirst.mockResolvedValueOnce(book)
    kysely.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(book)

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(update)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)

    await syncAddBook(ctx, books, bookMd)

    expect(mocks.bookMdToBookCreateInput).not.toHaveBeenCalledOnce()
    expect(mocks.getSlugFromBookMd).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookUpdateInput).toHaveBeenCalled()
  })

  test('syncAddBook with flag dry-run', async () => {
    const kysely = mockDatabase()
    const ctx = makeContext({ flags: { dryRun: true }, db: kysely.db })
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const books = makeBooks()

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)

    await syncAddBook(ctx, books, bookMd)

    expect(mocks.bookMdToBookCreateInput).not.toHaveBeenCalledOnce()
    expect(mocks.getSlugFromBookMd).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalled()
  })

  test('syncAddBook catches error', async () => {
    const kysely = mockDatabase()
    const ctx = makeContext({ db: kysely.db })
    const bookMd = makeBookMd()
    const input = makeBookCreateInput()
    const slug = 'slug1'
    const books = makeBooks()

    kysely.queries.executeTakeFirstOrThrow.mockRejectedValueOnce(new Error('test'))

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(input)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)
    mocks.logError.mockResolvedValueOnce()

    await syncAddBook(ctx, books, bookMd)

    expect(mocks.bookMdToBookCreateInput).toHaveBeenCalledOnce()
    expect(mocks.getSlugFromBookMd).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalled()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })

  test('syncUpdateBook', async () => {
    const kysely = mockDatabase()
    const ctx = makeContext({ db: kysely.db })
    const bookMd = makeBookMd()
    const update = makeBookUpdateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })
    const books = makeBooks()

    kysely.queries.executeTakeFirst.mockResolvedValueOnce(book)
    kysely.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(book)

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(update)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)

    await syncUpdateBook(ctx, books, bookMd, slug)

    expect(mocks.bookMdToBookUpdateInput).toHaveBeenCalledOnce()
  })

  test('syncUpdateBook with keywords', async () => {
    const kysely = mockDatabase()
    const ctx = makeContext({ db: kysely.db })
    const bookMd = makeBookMd()
    const keywords = 'one,two'
    const update = makeBookUpdateInput({ keywords })
    const slug = 'slug1'
    const book = makeBook({ slug, keywords })
    const books = makeBooks()

    kysely.queries.executeTakeFirst.mockResolvedValueOnce(book)
    kysely.queries.executeTakeFirstOrThrow.mockResolvedValueOnce(book)

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(update)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)
    mocks.syncTagsFor.mockResolvedValue(undefined)

    await syncUpdateBook(ctx, books, bookMd, slug)

    expect(mocks.bookMdToBookUpdateInput).toHaveBeenCalledOnce()
    expect(mocks.syncTagsFor).toHaveBeenCalledOnce()
  })

  test('syncUpdateBook with flag dry-run', async () => {
    const kysely = mockDatabase()
    const ctx = makeContext({ flags: { dryRun: true }, db: kysely.db })
    const bookMd = makeBookMd()
    const update = makeBookUpdateInput()
    const slug = 'slug1'
    const books = makeBooks()

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(update)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)

    await syncUpdateBook(ctx, books, bookMd, slug)

    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalledOnce()
  })

  test('syncUpdateBook catches error', async () => {
    const kysely = mockDatabase()
    const ctx = makeContext({ db: kysely.db })
    const bookMd = makeBookMd()
    const update = makeBookUpdateInput()
    const slug = 'slug1'
    const book = makeBook({ slug })
    const books = makeBooks()

    kysely.queries.executeTakeFirst.mockResolvedValueOnce(book)
    kysely.queries.executeTakeFirstOrThrow.mockRejectedValueOnce(new Error('test'))

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(update)
    mocks.getSlugFromBookMd.mockResolvedValueOnce(slug)

    await syncUpdateBook(ctx, books, bookMd, slug)

    expect(mocks.bookMdToBookUpdateInput).toHaveBeenCalledOnce()
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
