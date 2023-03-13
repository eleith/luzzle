import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command from './dump'
import { ArgumentsCamelCase } from 'yargs'
import { makeBook, makeBookMd } from '../book.fixtures'
import { makeContext } from './context.fixtures'
import { bookToMd, writeBookMd, cacheBook } from '../book'
import { CpuInfo, cpus } from 'os'
import log from '../log'

vi.mock('../book')
vi.mock('os')
vi.mock('log')

const mocks = {
  logError: vi.spyOn(log, 'error'),
  bookToMd: vi.mocked(bookToMd),
  writeBookMd: vi.mocked(writeBookMd),
  cacheBook: vi.mocked(cacheBook),
  cpus: vi.mocked(cpus),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/dump', () => {
  afterEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset()
    })

    Object.keys(spies).forEach((key) => {
      spies[key].mockRestore()
      delete spies[key]
    })
  })

  test('dump', async () => {
    const ctx = makeContext()
    const books = [makeBook(), makeBook(), makeBook()]
    const bookMd = makeBookMd()

    spies.prismaFindMany = vi.spyOn(ctx.prisma.book, 'findMany')
    spies.prismaFindMany.mockResolvedValueOnce(books)

    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    mocks.bookToMd.mockResolvedValueOnce(bookMd)
    mocks.writeBookMd.mockResolvedValueOnce()
    mocks.cacheBook.mockResolvedValueOnce()

    await command.run(ctx, {} as ArgumentsCamelCase)

    expect(spies.prismaFindMany).toHaveBeenCalledTimes(1)
    expect(mocks.writeBookMd).toHaveBeenCalledTimes(3)
  })

  test('dump with flag dry-run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const books = [makeBook(), makeBook(), makeBook()]
    const bookMd = makeBookMd()

    spies.prismaFindMany = vi.spyOn(ctx.prisma.book, 'findMany')
    spies.prismaFindMany.mockResolvedValueOnce(books)

    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    mocks.bookToMd.mockResolvedValueOnce(bookMd)
    mocks.writeBookMd.mockResolvedValueOnce()
    mocks.cacheBook.mockResolvedValueOnce()

    await command.run(ctx, {} as ArgumentsCamelCase)

    expect(spies.prismaFindMany).toHaveBeenCalledOnce()
    expect(mocks.writeBookMd).not.toHaveBeenCalled()
  })

  test('dump with error', async () => {
    const ctx = makeContext()
    const books = [makeBook()]
    const bookMd = makeBookMd()

    spies.prismaFindMany = vi.spyOn(ctx.prisma.book, 'findMany')
    spies.prismaFindMany.mockResolvedValueOnce(books)

    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    mocks.bookToMd.mockResolvedValueOnce(bookMd)
    mocks.writeBookMd.mockRejectedValueOnce(new Error('error'))

    await command.run(ctx, {} as ArgumentsCamelCase)

    expect(spies.prismaFindMany).toHaveBeenCalledOnce()
    expect(mocks.writeBookMd).toHaveBeenCalled()
    expect(mocks.logError).toHaveBeenCalled()
  })
})
