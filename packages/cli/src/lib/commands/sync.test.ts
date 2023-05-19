import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { SyncArgv } from './sync'
import yargs, { ArgumentsCamelCase } from 'yargs'
import { makeBookMd } from '../books/book.fixtures'
import { makeContext } from './context.fixtures'
import { getBook, getUpdatedSlugs, Books } from '../books'
import { syncAddBook, syncRemoveBooks, syncUpdateBook } from './sync.private'
import { BookDatabaseCache } from '../books/book.schemas'
import { Cache } from '../cache'

vi.mock('./sync.private')
vi.mock('../books')

const mocks = {
  getUpdatedSlugs: vi.mocked(getUpdatedSlugs),
  getBook: vi.mocked(getBook),
  syncAddBook: vi.mocked(syncAddBook),
  syncRemoveBooks: vi.mocked(syncRemoveBooks),
  syncUpdateBook: vi.mocked(syncUpdateBook),
  Books: vi.mocked(Books),
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
    const bookMd = makeBookMd()
    const cache = {
      database: { slug: slugs[0] },
    } as unknown as Cache<BookDatabaseCache>

    mocks.Books.mockImplementation(() => {
      return {
        cache: {
          get: () => cache,
        },
        getAllSlugs: () => slugs,
      } as unknown as Books
    })
    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugs)
    mocks.getBook.mockResolvedValue(bookMd)
    mocks.syncRemoveBooks.mockResolvedValue()
    mocks.syncAddBook.mockResolvedValue()

    await command.run(ctx, {} as ArgumentsCamelCase<SyncArgv>)

    expect(mocks.getBook).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.syncRemoveBooks).toHaveBeenCalled()
    expect(mocks.syncAddBook).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.syncUpdateBook).not.toHaveBeenCalled()
  })

  test('sync update 2 books to db', async () => {
    const ctx = makeContext()
    const slugs = ['a', 'b']
    const bookMd = makeBookMd()
    const cache = {
      database: { id: '123', slug: slugs[0] },
    } as unknown as Cache<BookDatabaseCache>

    mocks.Books.mockImplementation(() => {
      return {
        cache: {
          get: () => cache,
        },
        getAllSlugs: () => slugs,
      } as unknown as Books
    })
    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugs)
    mocks.getBook.mockResolvedValue(bookMd)
    mocks.syncRemoveBooks.mockResolvedValue()
    mocks.syncUpdateBook.mockResolvedValue()

    await command.run(ctx, {} as ArgumentsCamelCase<SyncArgv>)

    expect(mocks.getBook).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.syncRemoveBooks).toHaveBeenCalled()
    expect(mocks.syncUpdateBook).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.syncAddBook).not.toHaveBeenCalled()
  })

  test('sync with flag force', async () => {
    const ctx = makeContext()
    const slugs = ['a', 'b']
    const bookMd = makeBookMd()
    const cache = {
      database: { id: '123', slug: slugs[0] },
    } as unknown as Cache<BookDatabaseCache>

    mocks.Books.mockImplementation(() => {
      return {
        cache: {
          get: () => cache,
        },
        getAllSlugs: () => slugs,
      } as unknown as Books
    })
    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugs)
    mocks.getBook.mockResolvedValue(bookMd)
    mocks.syncRemoveBooks.mockResolvedValue()
    mocks.syncUpdateBook.mockResolvedValue()

    await command.run(ctx, { force: true } as ArgumentsCamelCase<SyncArgv>)

    expect(mocks.getUpdatedSlugs).not.toHaveBeenCalled()
    expect(mocks.getBook).toHaveBeenCalledTimes(slugs.length)
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
