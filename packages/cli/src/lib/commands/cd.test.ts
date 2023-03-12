import { ChildProcess, spawn } from 'child_process'
import { getBook } from '../book'
import log from '../log'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { EventEmitter } from 'stream'
import command from './cd'
import { ArgumentsCamelCase } from 'yargs'
import { makeContext } from './context.fixtures'

vi.mock('child_process')
vi.mock('../book')

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

    process.env.SHELL = 'fish'
    mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)

    await command.run(ctx, {} as ArgumentsCamelCase)

    expect(mocks.spawn).toHaveBeenCalledWith(process.env.SHELL, [], {
      cwd: ctx.directory,
      env: { ...process.env, LUZZLE: 'true' },
      stdio: 'inherit',
    })
  })

  test('run dry-run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })

    process.env.SHELL = 'fish'
    mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)

    await command.run(ctx, {} as ArgumentsCamelCase)

    expect(mocks.spawn).not.toHaveBeenCalled()
  })

  test('run with no editor', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })

    delete process.env.SHELL

    mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)

    await command.run(ctx, {} as ArgumentsCamelCase)

    expect(mocks.spawn).not.toHaveBeenCalled()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })

  test('run when luzzle is already set', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })

    process.env.LUZZLE = 'true'

    mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)

    await command.run(ctx, {} as ArgumentsCamelCase)

    expect(mocks.spawn).not.toHaveBeenCalled()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })
})
