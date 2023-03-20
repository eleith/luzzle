import { writeBookMd, createBookMd } from '../book'
import log from '../log'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { CreateArgv } from './create'
import { ArgumentsCamelCase } from 'yargs'
import { makeBookMd } from '../book.fixtures'
import yargs from 'yargs'
import { makeContext } from './context.fixtures'

vi.mock('../book')
vi.mock('../books')

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logChild: vi.spyOn(log, 'child'),
  createBookMd: vi.mocked(createBookMd),
  writeBookMd: vi.mocked(writeBookMd),
}

const spies: { [key: string]: SpyInstance } = {}

describe('tools/lib/commands/create', () => {
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

    mocks.createBookMd.mockResolvedValueOnce(book)
    mocks.writeBookMd.mockResolvedValueOnce()

    await command.run(ctx, { slug } as ArgumentsCamelCase<CreateArgv>)

    expect(mocks.createBookMd).toHaveBeenCalledOnce()
    expect(mocks.writeBookMd).toHaveBeenCalledOnce()
  })

  test('run with dry-run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const book = makeBookMd()
    const slug = 'slug2'

    mocks.createBookMd.mockResolvedValueOnce(book)
    mocks.writeBookMd.mockResolvedValueOnce()

    await command.run(ctx, { slug } as ArgumentsCamelCase<CreateArgv>)

    expect(mocks.createBookMd).not.toHaveBeenCalled()
    expect(mocks.writeBookMd).not.toHaveBeenCalled()
  })

  test('builder', async () => {
    const args = yargs()

    spies.positional = vi.spyOn(args, 'positional')
    command.builder?.(args)

    expect(spies.positional).toHaveBeenCalledOnce()
  })
})
