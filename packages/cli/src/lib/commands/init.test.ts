import log from '../log'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import command, { InitArgv } from './init'
import { ArgumentsCamelCase } from 'yargs'
import yargs from 'yargs'
import { makeContext } from './context.fixtures'
import { stat } from 'fs/promises'
import { Stats } from 'fs'
import { inititializeConfig, SchemaConfig } from '../config'
import Conf from 'conf/dist/source'

vi.mock('../book')
vi.mock('../config')
vi.mock('fs/promises')

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logChild: vi.spyOn(log, 'child'),
  stat: vi.mocked(stat),
  inititializeConfig: vi.mocked(inititializeConfig),
}

const spies: { [key: string]: SpyInstance } = {}

describe('tools/lib/commands/init', () => {
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
    const dir = 'luzzle-dir'

    mocks.stat.mockResolvedValueOnce({ isDirectory: () => true } as Stats)
    mocks.inititializeConfig.mockResolvedValueOnce({} as Conf<SchemaConfig>)

    await command.run(ctx, { dir } as ArgumentsCamelCase<InitArgv>)

    expect(mocks.stat).toHaveBeenCalledOnce()
    expect(mocks.inititializeConfig).toHaveBeenCalledOnce()
  })

  test('run with dry run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const dir = 'luzzle-dir'

    mocks.stat.mockResolvedValueOnce({ isDirectory: () => true } as Stats)
    mocks.inititializeConfig.mockResolvedValueOnce({} as Conf<SchemaConfig>)

    await command.run(ctx, { dir } as ArgumentsCamelCase<InitArgv>)

    expect(mocks.stat).toHaveBeenCalledOnce()
    expect(mocks.inititializeConfig).not.toHaveBeenCalled()
  })

  test('run with invalid dir', async () => {
    const ctx = makeContext()
    const dir = 'luzzle-dir'

    mocks.stat.mockResolvedValueOnce({ isDirectory: () => false } as Stats)
    mocks.inititializeConfig.mockResolvedValueOnce({} as Conf<SchemaConfig>)

    const run = command.run(ctx, { dir } as ArgumentsCamelCase<InitArgv>)

    expect(mocks.stat).toHaveBeenCalledOnce()
    expect(run).rejects.toThrow()
  })

  test('builder', async () => {
    const args = yargs()

    spies.positional = vi.spyOn(args, 'positional')
    command.builder?.(args)

    expect(spies.positional).toHaveBeenCalledOnce()
  })
})
