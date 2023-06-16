import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command from './dump.js'
import { Arguments } from 'yargs'
import { makeBook, makeBookMd } from '../books/book.fixtures.js'
import { makeContext } from './context.fixtures.js'
import { bookToMd, writeBookMd } from '../books/index.js'
import { CpuInfo, cpus } from 'os'
import log from '../log.js'
import { mockDatabase } from '../database.mock.js'

vi.mock('os')
vi.mock('log')
vi.mock('../books')

const mocks = {
  logError: vi.spyOn(log, 'error'),
  bookToMd: vi.mocked(bookToMd),
  writeBookMd: vi.mocked(writeBookMd),
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
    const bookMd = makeBookMd()

    kysely.queries.execute.mockResolvedValueOnce(books)
    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    mocks.bookToMd.mockResolvedValueOnce(bookMd)
    mocks.writeBookMd.mockResolvedValueOnce()

    await command.run(ctx, {} as Arguments)

    expect(mocks.writeBookMd).toHaveBeenCalledTimes(3)
  })

  test('dump with flag dry-run', async () => {
    const kysely = mockDatabase()
    const ctx = makeContext({ flags: { dryRun: true }, db: kysely.db })
    const books = [makeBook(), makeBook(), makeBook()]
    const bookMd = makeBookMd()

    kysely.queries.execute.mockResolvedValueOnce(books)
    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    mocks.bookToMd.mockResolvedValueOnce(bookMd)
    mocks.writeBookMd.mockResolvedValueOnce()

    await command.run(ctx, {} as Arguments)

    expect(mocks.writeBookMd).not.toHaveBeenCalled()
  })

  test('dump with error', async () => {
    const kyselyMock = mockDatabase()
    const ctx = makeContext({ db: kyselyMock.db })
    const books = [makeBook()]
    const bookMd = makeBookMd()

    kyselyMock.queries.execute.mockResolvedValueOnce(books)
    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    mocks.bookToMd.mockResolvedValueOnce(bookMd)
    mocks.writeBookMd.mockRejectedValueOnce(new Error('error'))

    await command.run(ctx, {} as Arguments)

    expect(mocks.writeBookMd).toHaveBeenCalled()
    expect(mocks.logError).toHaveBeenCalled()
  })
})
