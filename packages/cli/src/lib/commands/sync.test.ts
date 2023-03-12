import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command from './sync'
import { ArgumentsCamelCase } from 'yargs'
import { makeBookMd, makeBookCache } from '../book.fixtures'
import { makeContext } from './context.fixtures'
import { getBook, readBookDir, getUpdatedSlugs, getBookCache } from '../book'
import { syncAddBook, syncRemoveBooks, syncUpdateBook } from './sync.private'

vi.mock('../book')
vi.mock('./sync.private')

const mocks = {
  getUpdatedSlugs: vi.mocked(getUpdatedSlugs),
  getBook: vi.mocked(getBook),
  readBookDir: vi.mocked(readBookDir),
  getBookCache: vi.mocked(getBookCache),
  syncAddBook: vi.mocked(syncAddBook),
  syncRemoveBooks: vi.mocked(syncRemoveBooks),
  syncUpdateBook: vi.mocked(syncUpdateBook),
}

const spies: { [key: string]: SpyInstance } = {}

describe('tools/lib/commands/sync', () => {
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
    const bookMd = makeBookMd()
    const cache = makeBookCache()

    mocks.readBookDir.mockResolvedValueOnce(slugs)
    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugs)
    mocks.getBook.mockResolvedValue(bookMd)
    mocks.getBookCache.mockResolvedValue(cache)
    mocks.syncRemoveBooks.mockResolvedValue()
    mocks.syncAddBook.mockResolvedValue()

    await command.run(ctx, {} as ArgumentsCamelCase)

    expect(mocks.getUpdatedSlugs).toHaveBeenCalledWith(slugs, ctx.directory, 'lastSynced')
    expect(mocks.getBook).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.getBookCache).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.syncRemoveBooks).toHaveBeenCalled()
    expect(mocks.syncAddBook).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.syncUpdateBook).not.toHaveBeenCalled()
  })

  test('sync update 2 books to db', async () => {
    const ctx = makeContext()
    const slugs = ['a', 'b']
    const bookMd = makeBookMd()
    const cache = makeBookCache({
      database: { id: '123', slug: slugs[0] },
    })

    mocks.readBookDir.mockResolvedValueOnce(slugs)
    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugs)
    mocks.getBook.mockResolvedValue(bookMd)
    mocks.getBookCache.mockResolvedValue(cache)
    mocks.syncRemoveBooks.mockResolvedValue()
    mocks.syncUpdateBook.mockResolvedValue()

    await command.run(ctx, {} as ArgumentsCamelCase)

    expect(mocks.getUpdatedSlugs).toHaveBeenCalledWith(slugs, ctx.directory, 'lastSynced')
    expect(mocks.getBook).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.getBookCache).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.syncRemoveBooks).toHaveBeenCalled()
    expect(mocks.syncUpdateBook).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.syncAddBook).not.toHaveBeenCalled()
  })

  test('sync with flag force', async () => {
    const ctx = makeContext({ flags: { force: true } })
    const slugs = ['a', 'b']
    const bookMd = makeBookMd()
    const cache = makeBookCache({
      database: { id: '123', slug: slugs[0] },
    })

    mocks.readBookDir.mockResolvedValueOnce(slugs)
    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugs)
    mocks.getBook.mockResolvedValue(bookMd)
    mocks.getBookCache.mockResolvedValue(cache)
    mocks.syncRemoveBooks.mockResolvedValue()
    mocks.syncUpdateBook.mockResolvedValue()

    await command.run(ctx, {} as ArgumentsCamelCase)

    expect(mocks.getUpdatedSlugs).not.toHaveBeenCalled()
    expect(mocks.getBook).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.getBookCache).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.syncRemoveBooks).toHaveBeenCalled()
    expect(mocks.syncUpdateBook).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.syncAddBook).not.toHaveBeenCalled()
  })
})
