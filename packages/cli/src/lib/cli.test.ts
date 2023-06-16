import { stat } from 'fs/promises'
import { getDatabaseClient } from '@luzzle/kysely'
import log from './log.js'
import cli from './cli.js'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { getDirectoryFromConfig, getConfig, Config } from './config.js'
import commands from './commands/index.js'
import { mockDatabase } from './database.mock.js'

vi.mock('os')
vi.mock('fs/promises')
vi.mock('./book')
vi.mock('@luzzle/kysely')
vi.mock('./config')
vi.mock('./commands')

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logChild: vi.spyOn(log, 'child'),
  logLevelSet: vi.spyOn(log, 'level', 'set'),
  stat: vi.mocked(stat),
  getDatabaseClient: vi.mocked(getDatabaseClient),
  getDirectoryConfig: vi.mocked(getDirectoryFromConfig),
  getConfig: vi.mocked(getConfig),
}

const spies: SpyInstance[] = []

describe('lib/cli', () => {
  afterEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset()
    })

    spies.forEach((spy) => {
      spy.mockRestore()
    })
  })

  test(`run init`, async () => {
    const config = {} as Config

    mocks.getConfig.mockReturnValueOnce(config)
    mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')

    const spyRun = vi.spyOn(commands.init, 'run')
    spyRun.mockResolvedValueOnce(undefined)

    process.argv = ['node', 'cli', commands.init.name, 'test']

    await cli()

    expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
    expect(spyRun).toHaveBeenCalledOnce()
  })

  test(`run edit-config`, async () => {
    const config = {} as Config
    const kysely = mockDatabase()

    mocks.getConfig.mockReturnValueOnce(config)
    mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')
    mocks.getDatabaseClient.mockReturnValueOnce(kysely.db)

    const spyRun = vi.spyOn(commands.editConfig, 'run')
    spyRun.mockResolvedValueOnce(undefined)

    process.argv = ['node', 'cli', commands.editConfig.name]

    await cli()

    expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
    expect(spyRun).toHaveBeenCalledOnce()
    expect(kysely.db.destroy).toHaveBeenCalledOnce()
  })

  test(`run catches an error`, async () => {
    const config = {} as Config
    const kysely = mockDatabase()

    mocks.getConfig.mockReturnValueOnce(config)
    mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')
    mocks.getDatabaseClient.mockReturnValueOnce(kysely.db)

    const spyRun = vi.spyOn(commands.editConfig, 'run')
    spyRun.mockRejectedValueOnce(new Error('some error'))

    spies.push(spyRun)

    process.argv = ['node', 'cli', commands.editConfig.name]

    await cli()

    expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
    expect(spyRun).toHaveBeenCalledOnce()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })
})
