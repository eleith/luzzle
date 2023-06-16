import { ChildProcess, spawn } from 'child_process'
import log from '../log.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { EventEmitter } from 'stream'
import command from './editConfig.js'
import { Arguments } from 'yargs'
import { makeContext } from './context.fixtures.js'

vi.mock('child_process')

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logChild: vi.spyOn(log, 'child'),
  logLevelSet: vi.spyOn(log, 'level', 'set'),
  spawn: vi.mocked(spawn),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/commands/editConfig', () => {
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

    process.env.EDITOR = 'vi'
    mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)

    await command.run(ctx, {} as Arguments)

    expect(mocks.spawn).toHaveBeenCalledWith(process.env.EDITOR, [ctx.config.path], {
      cwd: ctx.directory,
      env: { ...process.env, LUZZLE: 'true' },
      stdio: 'inherit',
    })
  })

  test('run dry-run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })

    process.env.EDITOR = 'vi'
    mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)

    await command.run(ctx, {} as Arguments)

    expect(mocks.spawn).not.toHaveBeenCalled()
  })

  test('run with no editor', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })

    delete process.env.EDITOR

    mocks.spawn.mockReturnValueOnce(new EventEmitter() as unknown as ChildProcess)

    await command.run(ctx, {} as Arguments)

    expect(mocks.spawn).not.toHaveBeenCalled()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })
})
