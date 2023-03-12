import { getBook, writeBookMd, downloadCover } from '../book'
import log from '../log'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { AttachArgv } from './attach'
import { ArgumentsCamelCase } from 'yargs'
import { makeBookMd } from '../book.fixtures'
import yargs from 'yargs'
import { makeContext } from './context.fixtures'

vi.mock('child_process')
vi.mock('../book')

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logChild: vi.spyOn(log, 'child'),
  getBook: vi.mocked(getBook),
  writeBookMd: vi.mocked(writeBookMd),
  downloadCover: vi.mocked(downloadCover),
}

const spies: { [key: string]: SpyInstance } = {}

describe('tools/lib/commands/attach', () => {
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
    const slug = 'slug2'
    const file = 'file2'

    mocks.getBook.mockResolvedValueOnce(book)
    mocks.downloadCover.mockResolvedValueOnce(book)
    mocks.writeBookMd.mockResolvedValueOnce()

    await command.run(ctx, { slug, file } as ArgumentsCamelCase<AttachArgv>)

    expect(mocks.getBook).toHaveBeenCalledOnce()
    expect(mocks.downloadCover).toHaveBeenCalledOnce()
    expect(mocks.writeBookMd).toHaveBeenCalledOnce()
  })

  test('run with dry-run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const book = makeBookMd()
    const slug = 'slug2'
    const file = 'file2'

    mocks.getBook.mockResolvedValueOnce(book)
    mocks.downloadCover.mockResolvedValueOnce(book)
    mocks.writeBookMd.mockResolvedValueOnce()

    await command.run(ctx, { slug, file } as ArgumentsCamelCase<AttachArgv>)

    expect(mocks.getBook).toHaveBeenCalledOnce()
    expect(mocks.downloadCover).not.toHaveBeenCalledOnce()
    expect(mocks.writeBookMd).not.toHaveBeenCalledOnce()
  })

  test('run does not find slug', async () => {
    const ctx = makeContext()
    const book = makeBookMd()
    const slug = 'slug2'
    const file = 'file2'

    mocks.getBook.mockResolvedValueOnce(null)
    mocks.downloadCover.mockResolvedValueOnce(book)
    mocks.writeBookMd.mockResolvedValueOnce()

    await command.run(ctx, { slug, file } as ArgumentsCamelCase<AttachArgv>)

    expect(mocks.getBook).toHaveBeenCalledOnce()
    expect(mocks.downloadCover).not.toHaveBeenCalledOnce()
    expect(mocks.writeBookMd).not.toHaveBeenCalledOnce()
  })

  test('builder', async () => {
    const args = yargs()

    spies.positional = vi.spyOn(args, 'positional')
    command.builder?.(args)

    expect(spies.positional).toHaveBeenCalledTimes(2)
  })
})
