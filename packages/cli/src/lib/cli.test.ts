import { CpuInfo, cpus } from 'os'
import { merge } from 'lodash'
import { Stats } from 'fs'
import { stat } from 'fs/promises'
import got from 'got'
import {
  bookMdToBookCreateInput,
  bookMdToBookUpdateInput,
  getBook,
  readBookDir,
  bookToMd,
  getBookCache,
  cacheBook,
  processBookMd,
  writeBookMd,
  getUpdatedSlugs,
  cleanUpDerivatives,
  fetchBookMd,
  downloadCover,
  createBookMd,
} from './book'
import * as bookFixtures from './book.fixtures'
import log from './log'
import * as cli from './cli'
import { DeepPartial } from '../@types/utilities'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import { getPrismaClient, PrismaClient } from './prisma'
import { getDirectoryFromConfig, inititializeConfig, getConfig, Config } from './config'
import commands, { Context } from './commands'

vi.mock('os')
vi.mock('fs/promises')
vi.mock('got')
vi.mock('child_process')
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
}

const mocks = {
  cpus: vi.mocked(cpus),
  logInfo: vi.spyOn(log, 'info'),
  logError: vi.spyOn(log, 'error'),
  logChild: vi.spyOn(log, 'child'),
  logLevelSet: vi.spyOn(log, 'level', 'set'),
  stat: vi.mocked(stat),
  getBook: vi.mocked(getBook),
  readBookDir: vi.mocked(readBookDir),
  bookMdToBookUpdateInput: vi.mocked(bookMdToBookUpdateInput),
  bookMdToBookCreateInput: vi.mocked(bookMdToBookCreateInput),
  prisma$disconnect: vi.spyOn(prisma, '$disconnect'),
  prismaBookFindMany: vi.spyOn(prisma.book, 'findMany'),
  prismaBookDeleteMany: vi.spyOn(prisma.book, 'deleteMany'),
  prismaBookUpdate: vi.spyOn(prisma.book, 'update'),
  prismaBookFindUnique: vi.spyOn(prisma.book, 'findUnique'),
  prismaBookCreate: vi.spyOn(prisma.book, 'create'),
  bookToMd: vi.mocked(bookToMd),
  getBookCache: vi.mocked(getBookCache),
  cacheBook: vi.mocked(cacheBook),
  processBookMd: vi.mocked(processBookMd),
  writeBookMd: vi.mocked(writeBookMd),
  getUpdatedSlugs: vi.mocked(getUpdatedSlugs),
  cleanUpDerivatives: vi.mocked(cleanUpDerivatives),
  getPrismaClient: vi.mocked(getPrismaClient),
  getDirectoryConfig: vi.mocked(getDirectoryFromConfig),
  inititializeConfig: vi.mocked(inititializeConfig),
  getConfig: vi.mocked(getConfig),
  fetchBookMd: vi.mocked(fetchBookMd),
  downloadCover: vi.mocked(downloadCover),
  createBook: vi.mocked(createBookMd),
  gotPost: vi.mocked(got.post),
}

const spies: { [key: string]: SpyInstance } = {}

type Command = Awaited<ReturnType<typeof cli._private._parseArgs>>

function makeCommand(overrides?: DeepPartial<Command>): Command {
  return merge(
    {
      name: 'sync',
      options: {
        _: [],
        $0: '',
        slug: 'slug',
        file: 'file',
        dir: 'dir',
        ['dry-run']: false,
        config: undefined,
        dryRun: false,
        force: false,
        verbose: false,
      },
    },
    overrides
  )
}

function makeContext(overrides?: DeepPartial<Context>): Context {
  mocks.getPrismaClient.mockReturnValue(prisma as unknown as PrismaClient)

  return merge(
    {
      prisma: mocks.getPrismaClient(),
      log,
      directory: 'somewhere',
      config: {} as Config,
      flags: {
        dryRun: false,
        verbose: false,
        force: false,
      },
    },
    overrides
  )
}

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

  test('run _dump with options', async () => {
    const command = makeCommand({ name: 'dump', options: { verbose: true, dryRun: true } })
    const config = {} as Config

    mocks.getConfig.mockReturnValueOnce(config)
    mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')

    spies.parseArgs = vi.spyOn(cli._private, '_parseArgs')
    spies.cleanup = vi.spyOn(cli._private, '_cleanup')
    spies.dump = vi.spyOn(cli._private, '_dump')

    spies.parseArgs.mockResolvedValueOnce(command)
    spies.dump.mockResolvedValueOnce(undefined)
    spies.cleanup.mockResolvedValueOnce(undefined)

    await cli.run()

    expect(mocks.logLevelSet).toHaveBeenNthCalledWith(1, 'info')
    expect(mocks.logChild).toHaveBeenCalledWith({ dryRun: true }, { level: 'info' })
    expect(spies.dump).toHaveBeenCalled()
    expect(spies.cleanup).toHaveBeenCalled()
  })

  test('run _dump', async () => {
    const command = makeCommand({ name: 'dump' })
    const config = {} as Config

    mocks.getConfig.mockReturnValueOnce(config)
    mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')

    spies.parseArgs = vi.spyOn(cli._private, '_parseArgs')
    spies.cleanup = vi.spyOn(cli._private, '_cleanup')
    spies.dump = vi.spyOn(cli._private, '_dump')

    spies.parseArgs.mockResolvedValueOnce(command)
    spies.dump.mockResolvedValueOnce(undefined)
    spies.cleanup.mockResolvedValueOnce(undefined)

    await cli.run()

    expect(spies.dump).toHaveBeenCalled()
    expect(spies.cleanup).toHaveBeenCalled()
  })

  Object.keys(commands).forEach((commandName) => {
    test(`run ${commandName}`, async () => {
      const command = commands[commandName as keyof typeof commands]
      const argv = makeCommand({ name: command.name })
      const config = {} as Config

      mocks.getConfig.mockReturnValueOnce(config)
      mocks.getDirectoryConfig.mockReturnValueOnce('somewhere')

      spies.parseArgs = vi.spyOn(cli._private, '_parseArgs')
      spies.cleanup = vi.spyOn(cli._private, '_cleanup')
      spies.run = vi.spyOn(command, 'run')

      spies.parseArgs.mockResolvedValueOnce(argv)
      spies.cleanup.mockResolvedValueOnce(undefined)

      await cli.run()

      expect(mocks.logLevelSet).toHaveBeenNthCalledWith(1, 'warn')
      expect(spies.run).toHaveBeenCalledOnce()
    })
  })

  test('_cleanup', async () => {
    const ctx = makeContext()

    mocks.prisma$disconnect.mockResolvedValueOnce(null)

    await cli._private._cleanup(ctx)

    expect(mocks.prisma$disconnect).toHaveBeenCalled()
  })

  test('_dumpBook', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook()
    const bookMd = bookFixtures.makeBookMd()

    mocks.bookToMd.mockResolvedValueOnce(bookMd)
    mocks.writeBookMd.mockResolvedValueOnce()
    mocks.cacheBook.mockResolvedValueOnce()

    await cli._private._dumpBook(ctx, book)

    expect(mocks.bookToMd).toHaveBeenCalledOnce()
    expect(mocks.logInfo).toHaveBeenCalled()
  })

  test('_dumpBook skips on dry run', async () => {
    const ctx = makeContext({ flags: { dryRun: true } })
    const book = bookFixtures.makeBook()

    await cli._private._dumpBook(ctx, book)

    expect(mocks.bookToMd).not.toHaveBeenCalledOnce()
    expect(mocks.logInfo).toHaveBeenCalled()
  })

  test('_dumpBook catches error', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook()

    mocks.bookToMd.mockRejectedValueOnce(new Error('boom'))

    await cli._private._dumpBook(ctx, book)

    expect(log.error).toHaveBeenCalled()
  })

  test('_dump', async () => {
    const ctx = makeContext()
    const books = [bookFixtures.makeBook(), bookFixtures.makeBook(), bookFixtures.makeBook()]
    spies.syncBookToDisk = vi.spyOn(cli._private, '_dumpBook')

    mocks.prismaBookFindMany.mockResolvedValue(books)
    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    spies.syncBookToDisk.mockResolvedValue(undefined)

    await cli._private._dump(ctx)

    expect(spies.syncBookToDisk).toHaveBeenCalledTimes(3)
  })

  test('_dump', async () => {
    const ctx = makeContext()
    const books = [bookFixtures.makeBook(), bookFixtures.makeBook(), bookFixtures.makeBook()]
    spies.syncBookToDisk = vi.spyOn(cli._private, '_dumpBook')

    mocks.prismaBookFindMany.mockResolvedValue(books)
    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    spies.syncBookToDisk.mockResolvedValue(undefined)

    await cli._private._dump(ctx)

    expect(spies.syncBookToDisk).toHaveBeenCalledTimes(3)
  })

  test('_parseArgs throws if dir does not exist', async () => {
    const args = ['sync', 'test-folder']
    const spyConsoleError = vi.spyOn(console, 'error')

    mocks.stat.mockRejectedValueOnce(new Error('boom'))
    spyConsoleError.mockReturnValue()
    const command = cli._private._parseArgs(args)

    await expect(command).rejects.toThrow()
  })

  test('_parseArgs throws if command does not exist', async () => {
    const args = ['boom', 'test-folder']
    const dirStats = { isDirectory: () => true } as Stats
    const spyConsoleError = vi.spyOn(console, 'error')

    mocks.stat.mockResolvedValueOnce(dirStats)
    spyConsoleError.mockReturnValue()

    const command = cli._private._parseArgs(args)

    await expect(command).rejects.toThrow()
  })
})
