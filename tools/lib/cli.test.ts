import { mocked } from 'ts-jest/utils'
import { Command } from './cli'
import log from './log'
import { cpus } from 'os'
import { omit } from 'lodash'
import prisma, { prismaClientMockReset } from './prisma.mock'
import * as cli from './cli'

jest.mock('os')
jest.mock('./log')

const mocks = {
  cpus: mocked(cpus),
  logInfo: mocked(log.info),
}

const spies = {
  _parseArgs: jest.spyOn(cli, '_parseArgs'),
  _syncToDisk: jest.spyOn(cli, '_syncToDisk'),
  _syncToDb: jest.spyOn(cli, '_syncToDb'),
  _cleanup: jest.spyOn(cli, '_cleanup'),
}

function makeCommand(
  overrides?: Partial<Command | { options: Partial<Command['options']> }>
): Command {
  return {
    name: 'sync',
    options: {
      isDryRun: false,
      verbose: 0,
      dir: './somewhere',
      ...overrides?.options,
    },
    ...omit(overrides, 'options'),
  }
}

describe('tools/lib/cli', () => {
  afterEach(() => {
    const mockKeys = Object.keys(mocks) as (keyof typeof mocks)[]
    const spyKeys = Object.keys(spies) as (keyof typeof spies)[]

    mockKeys.forEach((key) => {
      mocks[key].mockReset()
    })

    prismaClientMockReset()

    spyKeys.forEach((key) => {
      spies[key].mockClear()
    })
  })

  test('run with defaults', async () => {
    const command = makeCommand()

    spies._parseArgs.mockReturnValueOnce(command)
    spies._syncToDb.mockResolvedValueOnce()
    spies._cleanup.mockResolvedValueOnce()

    const ctx = await cli.run()

    expect(log.level).toBe('info')
    expect(log.heading).toBe('')
    expect(spies._syncToDb).toHaveBeenCalledWith(ctx)
    expect(spies._cleanup).toHaveBeenCalledWith(ctx)
    expect(spies._syncToDisk).not.toHaveBeenCalled()
  })

  test('run with overrides', async () => {
    const command = makeCommand({ name: 'dump', options: { verbose: 1, isDryRun: true } })

    spies._parseArgs.mockReturnValueOnce(command)
    spies._syncToDisk.mockResolvedValueOnce()
    spies._cleanup.mockResolvedValueOnce()

    const ctx = await cli.run()

    expect(log.level).toBe('silly')
    expect(log.heading).toBe('[would-have]')
    expect(spies._syncToDisk).toHaveBeenCalledWith(ctx)
    expect(spies._cleanup).toHaveBeenCalledWith(ctx)
    expect(spies._syncToDb).not.toHaveBeenCalled()
  })
})
