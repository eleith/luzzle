import { ChildProcess, spawn } from 'child_process'
import { getBook } from '../book'
import log from '../log'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { EventEmitter } from 'stream'
import command, { EditArgv } from './edit'
import { ArgumentsCamelCase } from 'yargs'
import { makeBookMd } from '../book.fixtures'
import yargs from 'yargs'
import { makeContext } from './context.fixtures'

vi.mock('child_process')
vi.mock('../book')
vi.mock('../books')

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logChild: vi.spyOn(log, 'child'),
  logLevelSet: vi.spyOn(log, 'level', 'set'),
  spawn: vi.mocked(spawn),
  getBook: vi.mocked(getBook),
}

const spies: { [key: string]: SpyInstance } = {}

describe('tools/lib/commands/edit', () => {
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

    process.env.EDITOR = 'vi'
    mocks.getBook.mockResolvedValueOnce(book)
    mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)

    await command.run(ctx, { slug } as ArgumentsCamelCase<EditArgv>)

    expect(mocks.spawn).toHaveBeenCalledWith(process.env.EDITOR, [book.filename], {
      cwd: ctx.directory,
      env: { ...process.env, LUZZLE: 'true' },
      stdio: 'inherit',
    })
  })

  test('run dry-run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const book = makeBookMd()
    const slug = 'slug2'

    process.env.EDITOR = 'vi'
    mocks.getBook.mockResolvedValueOnce(book)
    mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)

    await command.run(ctx, { slug } as ArgumentsCamelCase<EditArgv>)

    expect(mocks.spawn).not.toHaveBeenCalled()
  })

  test('run with non existant slug', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const slug = 'slug2'

    process.env.EDITOR = 'vi'

    mocks.getBook.mockResolvedValueOnce(null)
    mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)

    await command.run(ctx, { slug } as ArgumentsCamelCase<EditArgv>)

    expect(mocks.spawn).not.toHaveBeenCalled()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })

  test('run with no editor', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const book = makeBookMd()
    const slug = 'slug2'

    delete process.env.EDITOR

    mocks.getBook.mockResolvedValueOnce(book)
    mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)

    await command.run(ctx, { slug } as ArgumentsCamelCase<EditArgv>)

    expect(mocks.spawn).not.toHaveBeenCalled()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })

  test('builder', async () => {
    const args = yargs()

    spies.positional = vi.spyOn(args, 'positional')
    command.builder?.(args)

    expect(spies.positional).toHaveBeenCalledOnce()
  })
})
