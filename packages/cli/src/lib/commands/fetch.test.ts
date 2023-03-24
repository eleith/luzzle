import { getBook, writeBookMd, fetchBookMd } from '../books'
import log from '../log'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { FetchArgv } from './fetch'
import { ArgumentsCamelCase } from 'yargs'
import { makeBookMd } from '../books/book.fixtures'
import yargs from 'yargs'
import { makeContext } from './context.fixtures'

vi.mock('../books')

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logWarn: vi.spyOn(log, 'warn'),
  logChild: vi.spyOn(log, 'child'),
  getBook: vi.mocked(getBook),
  writeBookMd: vi.mocked(writeBookMd),
  fetchBookMd: vi.mocked(fetchBookMd),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/fetch', () => {
  afterEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset()
    })

    Object.keys(spies).forEach((key) => {
      spies[key].mockRestore()
      delete spies[key]
    })
  })

  test('run with slug', async () => {
    const ctx = makeContext({ config: { get: () => ({ google_api_key: 'key' }) } })
    const book = makeBookMd()
    const slug = 'slug2'

    mocks.getBook.mockResolvedValueOnce(book)
    mocks.writeBookMd.mockResolvedValueOnce()
    mocks.fetchBookMd.mockResolvedValueOnce(book)

    await command.run(ctx, { slug } as ArgumentsCamelCase<FetchArgv>)

    expect(mocks.getBook).toHaveBeenCalledOnce()
    expect(mocks.writeBookMd).toHaveBeenCalledOnce()
    expect(mocks.fetchBookMd).toHaveBeenCalledOnce()
  })

  test('run with missing api key', async () => {
    const ctx = makeContext({ config: { get: () => ({ google_api_key: '' }) } })
    const book = makeBookMd()
    const slug = 'slug2'

    mocks.getBook.mockResolvedValueOnce(book)

    await command.run(ctx, { slug } as ArgumentsCamelCase<FetchArgv>)

    expect(mocks.getBook).toHaveBeenCalledOnce()
    expect(mocks.logWarn).toHaveBeenCalledOnce()
  })

  test('run with dry-run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const book = makeBookMd()
    const slug = 'slug2'

    mocks.getBook.mockResolvedValueOnce(book)
    mocks.writeBookMd.mockResolvedValueOnce()
    mocks.fetchBookMd.mockResolvedValueOnce(book)

    await command.run(ctx, { slug } as ArgumentsCamelCase<FetchArgv>)

    expect(mocks.getBook).toHaveBeenCalledOnce()
    expect(mocks.writeBookMd).not.toHaveBeenCalled()
    expect(mocks.fetchBookMd).not.toHaveBeenCalled()
  })

  test('run does not find slug', async () => {
    const ctx = makeContext()
    const book = makeBookMd()
    const slug = 'slug2'

    mocks.getBook.mockResolvedValueOnce(null)
    mocks.writeBookMd.mockResolvedValueOnce()
    mocks.fetchBookMd.mockResolvedValueOnce(book)

    await command.run(ctx, { slug } as ArgumentsCamelCase<FetchArgv>)

    expect(mocks.getBook).toHaveBeenCalledOnce()
    expect(mocks.writeBookMd).not.toHaveBeenCalled()
    expect(mocks.fetchBookMd).not.toHaveBeenCalled()
  })

  test('builder', async () => {
    const args = yargs()

    spies.positional = vi.spyOn(args, 'positional')
    command.builder?.(args)

    expect(spies.positional).toHaveBeenCalledTimes(2)
  })
})
