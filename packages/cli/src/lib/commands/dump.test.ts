import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command from './dump'
import { ArgumentsCamelCase } from 'yargs'
import { makeBook, makeBookMd } from '../books/book.fixtures'
import { makeContext } from './context.fixtures'
import { bookToMd, writeBookMd } from '../books'
import { CpuInfo, cpus } from 'os'
import log from '../log'

vi.mock('os')
vi.mock('log')
vi.mock('../books')

const mocks = {
  logError: vi.spyOn(log, 'error'),
  bookToMd: vi.mocked(bookToMd),
  writeBookMd: vi.mocked(writeBookMd),
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
