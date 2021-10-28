import { mocked } from 'ts-jest/utils'
import { Command } from './cli'
import { cpus } from 'os'
import { omit } from 'lodash'
import { Stats } from 'fs'
import { writeFile, readFile, utimes, stat } from 'fs/promises'
import prisma, { prismaClientMockReset } from './prisma.mock'
import { bookToString } from './book'
import * as bookFixtures from './book.fixtures'
import log from './log'
import * as cli from './cli'

jest.mock('os')
jest.mock('./log')
jest.mock('fs/promises')
jest.mock('./book')

const mocks = {
  cpus: mocked(cpus),
  logInfo: mocked(log.info),
  logError: mocked(log.error),
  writeFile: mocked(writeFile),
  utimes: mocked(utimes),
  stat: mocked(stat),
  readFile: mocked(readFile),
  bookToString: mocked(bookToString),
}

const spies = {
  _parseArgs: jest.spyOn(cli, '_parseArgs'),
  _syncToDisk: jest.spyOn(cli, '_syncToDisk'),
  _syncToDb: jest.spyOn(cli, '_syncToDb'),
  _cleanup: jest.spyOn(cli, '_cleanup'),
  _syncBookToDiskExecute: jest.spyOn(cli, '_syncBookToDiskExecute'),
}

function makeCommand(
  overrides?: Partial<Command | { options: Partial<Command['options']> }>
): Command {
  return {
    name: 'sync',
    options: {
      isDryRun: false,
      verbose: 0,
      dir: 'somewhere',
      ...overrides?.options,
    },
    ...omit(overrides, 'options'),
  }
}

function makeContext(command?: Command): cli.Context {
  return {
    prisma,
    log,
    command: command || makeCommand(),
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

    spies._parseArgs.mockResolvedValueOnce(command)
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

    spies._parseArgs.mockResolvedValueOnce(command)
    spies._syncToDisk.mockResolvedValueOnce()
    spies._cleanup.mockResolvedValueOnce()

    const ctx = await cli.run()

    expect(log.level).toBe('silly')
    expect(log.heading).toBe('[would-have]')
    expect(spies._syncToDisk).toHaveBeenCalledWith(ctx)
    expect(spies._cleanup).toHaveBeenCalledWith(ctx)
    expect(spies._syncToDb).not.toHaveBeenCalled()
  })

  test('_cleanup', async () => {
    const ctx = makeContext()

    await cli._cleanup(ctx)

    expect(prisma.$disconnect).toHaveBeenCalled()
  })

  test('_syncBookToDiskExecute', async () => {
    const ctx = makeContext()
    const filepath = '/somewhere'
    const bookMdString = 'a book with metadata'
    const updated = new Date()

    mocks.writeFile.mockResolvedValueOnce()
    mocks.utimes.mockResolvedValueOnce()

    await cli._syncBookToDiskExecute(ctx, filepath, bookMdString, updated)

    expect(mocks.writeFile).toHaveBeenCalledWith(filepath, bookMdString)
    expect(mocks.utimes).toHaveBeenCalledWith(filepath, updated, updated)
    expect(log.info).toHaveBeenCalled()
  })

  test('_syncBookToDiskExecute catches error', async () => {
    const ctx = makeContext()
    const filepath = '/somewhere'
    const bookMdString = 'a book with metadata'
    const updated = new Date()

    mocks.writeFile.mockResolvedValueOnce()
    mocks.utimes.mockRejectedValueOnce(new Error('boom'))

    await cli._syncBookToDiskExecute(ctx, filepath, bookMdString, updated)

    expect(log.error).toHaveBeenCalled()
  })

  test('_syncBookToDisk', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook({ date_updated: new Date() })
    const fileStat = { isFile: () => true } as Stats
    const fileString = 'book and metadata here'
    const bookToString = 'book and older metadata here'
    const filePath = `${ctx.command.options.dir}/${book.slug}.md`

    mocks.stat.mockResolvedValueOnce(fileStat)
    mocks.readFile.mockResolvedValueOnce(fileString)
    mocks.bookToString.mockResolvedValueOnce(bookToString)
    spies._syncBookToDiskExecute.mockResolvedValueOnce()

    await cli._syncBookToDisk(ctx, book)

    expect(mocks.bookToString).toHaveBeenCalledWith(book)
    expect(mocks.stat).toHaveBeenCalledWith(filePath)
    expect(mocks.readFile).toHaveBeenCalledWith(filePath, 'utf-8')
    expect(spies._syncBookToDiskExecute).toHaveBeenCalledWith(
      ctx,
      filePath,
      bookToString,
      book.date_updated
    )
  })

  test('_syncBookToDisk skips if sync not needed', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook({ date_updated: new Date() })
    const fileStat = { isFile: () => true } as Stats
    const fileString = 'book and metadata here'
    const bookToString = fileString
    const filePath = `${ctx.command.options.dir}/${book.slug}.md`

    mocks.stat.mockResolvedValueOnce(fileStat)
    mocks.readFile.mockResolvedValueOnce(fileString)
    mocks.bookToString.mockResolvedValueOnce(bookToString)

    await cli._syncBookToDisk(ctx, book)

    expect(mocks.bookToString).toHaveBeenCalledWith(book)
    expect(mocks.stat).toHaveBeenCalledWith(filePath)
    expect(mocks.readFile).toHaveBeenCalledWith(filePath, 'utf-8')
    expect(spies._syncBookToDiskExecute).not.toHaveBeenCalled()
  })
})
