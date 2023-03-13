import { stat } from 'fs/promises'
import log from './log'
import cli from './cli'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { getPrismaClient, PrismaClient } from './prisma'
import { getDirectoryFromConfig, inititializeConfig, getConfig, Config } from './config'
import commands from './commands'

vi.mock('os')
vi.mock('fs/promises')
vi.mock('./book')
vi.mock('./prisma')
vi.mock('./config')
vi.mock('./commands')

const prisma = {
  $disconnect: vi.fn(),
  book: {
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
} as unknown as PrismaClient

const mocks = {
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logChild: vi.spyOn(log, 'child'),
  logLevelSet: vi.spyOn(log, 'level', 'set'),
  stat: vi.mocked(stat),
  prisma$disconnect: vi.spyOn(prisma, '$disconnect'),
  getPrismaClient: vi.mocked(getPrismaClient),
  getDirectoryConfig: vi.mocked(getDirectoryFromConfig),
  inititializeConfig: vi.mocked(inititializeConfig),
  getConfig: vi.mocked(getConfig),
}

const spies: { [key: string]: SpyInstance } = {}

describe('lib/cli', () => {
  afterEach(() => {
    Object.values(mocks).forEach((mock) => {
      mock.mockReset()
    })

    Object.keys(spies).forEach((key) => {
      spies[key].mockRestore()
      delete spies[key]
    })
  })

  test(`run init`, async () => {
    const config = {} as Config

    mocks.getConfig.mockReturnValueOnce(config)
    mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')
    mocks.getPrismaClient.mockReturnValueOnce(prisma)

    spies.prismaDisconnect = vi.spyOn(prisma, '$disconnect')
    spies.prismaDisconnect.mockResolvedValueOnce(undefined)
    spies.run = vi.spyOn(commands.init, 'run')
    spies.run.mockResolvedValueOnce(undefined)

    process.argv = ['node', 'cli', commands.init.name, 'test']

    await cli()

    expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
    expect(spies.run).toHaveBeenCalledOnce()
    expect(spies.prismaDisconnect).toHaveBeenCalledOnce()
  })

  test(`run edit-config`, async () => {
    const config = {} as Config

    mocks.getConfig.mockReturnValueOnce(config)
    mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')
    mocks.getPrismaClient.mockReturnValueOnce(prisma)

    spies.prismaDisconnect = vi.spyOn(prisma, '$disconnect')
    spies.prismaDisconnect.mockResolvedValueOnce(undefined)
    spies.run = vi.spyOn(commands.editConfig, 'run')
    spies.run.mockResolvedValueOnce(undefined)

    process.argv = ['node', 'cli', commands.editConfig.name]

    await cli()

    expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
    expect(spies.run).toHaveBeenCalledOnce()
    expect(spies.prismaDisconnect).toHaveBeenCalledOnce()
  })

  test(`run catches an error`, async () => {
    const config = {} as Config

    mocks.getConfig.mockReturnValueOnce(config)
    mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')
    mocks.getPrismaClient.mockReturnValueOnce(prisma)

    spies.prismaDisconnect = vi.spyOn(prisma, '$disconnect')
    spies.prismaDisconnect.mockResolvedValueOnce(undefined)
    spies.run = vi.spyOn(commands.editConfig, 'run')
    spies.run.mockRejectedValueOnce(new Error('some error'))

    process.argv = ['node', 'cli', commands.editConfig.name]

    await cli()

    expect(mocks.logLevelSet).toHaveBeenCalledWith('warn')
    expect(spies.run).toHaveBeenCalledOnce()
    expect(mocks.logError).toHaveBeenCalledOnce()
  })
})
