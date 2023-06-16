import {
  getBook,
  writeBookMd,
  processBookMd,
  cleanUpDerivatives,
  getUpdatedSlugs,
  Books,
} from '../books/index.js'
import log from '../log.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { ProcessArgv } from './process.js'
import { Arguments } from 'yargs'
import { makeBookMd } from '../books/book.fixtures.js'
import yargs from 'yargs'
import { makeContext } from './context.fixtures.js'

vi.mock('../books')

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logChild: vi.spyOn(log, 'child'),
  getBook: vi.mocked(getBook),
  writeBookMd: vi.mocked(writeBookMd),
  processBookMd: vi.mocked(processBookMd),
  cleanUpDerivatives: vi.mocked(cleanUpDerivatives),
  getUpdatedSlugs: vi.mocked(getUpdatedSlugs),
  Books: vi.mocked(Books),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/process', () => {
  afterEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset()
    })

    Object.keys(spies).forEach((key) => {
      spies[key].mockRestore()
      delete spies[key]
    })
  })

  test('run', async () => {
    const ctx = makeContext()
    const book = makeBookMd()
    const slugs = ['slug3']

    mocks.getBook.mockResolvedValue(book)
    mocks.writeBookMd.mockResolvedValueOnce()
    mocks.processBookMd.mockResolvedValueOnce(book)
    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugs)
    mocks.cleanUpDerivatives.mockResolvedValueOnce()

    await command.run(ctx, {} as Arguments<ProcessArgv>)

    expect(mocks.getBook).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.processBookMd).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.writeBookMd).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.cleanUpDerivatives).toHaveBeenCalledOnce()
    expect(mocks.getUpdatedSlugs).toHaveBeenCalledOnce()
  })

  test('run with dry-run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const book = makeBookMd()
    const slugs = ['slug3']

    mocks.getBook.mockResolvedValue(book)
    mocks.writeBookMd.mockResolvedValueOnce()
    mocks.processBookMd.mockResolvedValueOnce(book)
    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugs)
    mocks.cleanUpDerivatives.mockResolvedValueOnce()

    await command.run(ctx, {} as Arguments<ProcessArgv>)

    expect(mocks.getBook).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.processBookMd).not.toHaveBeenCalled()
    expect(mocks.writeBookMd).not.toHaveBeenCalled()
    expect(mocks.cleanUpDerivatives).not.toHaveBeenCalled()
    expect(mocks.getUpdatedSlugs).toHaveBeenCalledOnce()
  })

  test('run with force flag', async () => {
    const ctx = makeContext()
    const book = makeBookMd()
    const slugs = ['slug3', 'slug2']

    mocks.Books.mockImplementation(() => {
      return {
        getAllSlugs: async () => slugs,
      } as unknown as Books
    })
    mocks.getBook.mockResolvedValue(book)
    mocks.writeBookMd.mockResolvedValueOnce()
    mocks.processBookMd.mockResolvedValueOnce(book)
    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugs)
    mocks.cleanUpDerivatives.mockResolvedValueOnce()

    await command.run(ctx, { force: true } as Arguments<ProcessArgv>)

    expect(mocks.getBook).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.processBookMd).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.writeBookMd).toHaveBeenCalledTimes(slugs.length)
    expect(mocks.cleanUpDerivatives).toHaveBeenCalledOnce()
    expect(mocks.getUpdatedSlugs).not.toHaveBeenCalled()
  })

  test('builder', async () => {
    const args = yargs()

    spies.options = vi.spyOn(args, 'options')
    command.builder?.(args)

    expect(spies.options).toHaveBeenCalledOnce()
  })
})
