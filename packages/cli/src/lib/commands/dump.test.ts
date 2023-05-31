import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command from './dump'
import { ArgumentsCamelCase } from 'yargs'
import { makeBook, makeBookMd } from '../books/book.fixtures'
import { makeContext } from './context.fixtures'
import { bookToMd, writeBookMd } from '../books'
import { CpuInfo, cpus } from 'os'
import log from '../log'
import { mockDatabase } from '../database.mock'

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

    await command.run(ctx, {} as ArgumentsCamelCase)

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

    await command.run(ctx, {} as ArgumentsCamelCase)

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

    await command.run(ctx, {} as ArgumentsCamelCase)

    expect(mocks.writeBookMd).toHaveBeenCalled()
    expect(mocks.logError).toHaveBeenCalled()
  })
})
