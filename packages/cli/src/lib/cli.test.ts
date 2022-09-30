import { Command } from './cli'
import { CpuInfo, cpus } from 'os'
import { merge } from 'lodash'
import { Stats } from 'fs'
import { stat } from 'fs/promises'
import {
  bookMdToBookCreateInput,
  bookMdToBookUpdateInput,
  getBook,
  readBookDir,
  bookToMd,
  getBookCache,
  cacheBook,
  processBookMd,
  updateBookMd,
  getUpdatedSlugs,
  cleanUpDerivatives,
} from './book'
import * as bookFixtures from './book.fixtures'
import log from './log'
import * as cli from './cli'
import { DeepPartial } from 'src/@types/utilities'
import { describe, expect, test, vi, afterEach, SpyInstance } from 'vitest'
import prisma from './prisma'
import path from 'path'

vi.mock('os')
// vi.mock('./log')
vi.mock('fs/promises')
vi.mock('./book')
vi.mock('./prisma', () => {
  return {
    default: {
      $disconnect: vi.fn(),
      book: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    },
  }
})

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
  updateBookMd: vi.mocked(updateBookMd),
  getUpdatedSlugs: vi.mocked(getUpdatedSlugs),
  cleanUpDerivatives: vi.mocked(cleanUpDerivatives),
}

const spies: { [key: string]: SpyInstance } = {}

function makeCommand(overrides?: DeepPartial<Command>): Command {
  return merge(
    {
      name: 'sync',
      options: {
        isDryRun: false,
        quiet: false,
        dir: 'somewhere',
        force: false,
      },
    },
    overrides
  )
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
    Object.values(mocks).forEach((mock) => {
      mock.mockReset()
    })

    Object.keys(spies).forEach((key) => {
      spies[key].mockRestore()
      delete spies[key]
    })
  })

  test('run _sync', async () => {
    const command = makeCommand()
    spies.parseArgs = vi.spyOn(cli._private, '_parseArgs')
    spies.syncToDb = vi.spyOn(cli._private, '_sync')
    spies.cleanup = vi.spyOn(cli._private, '_cleanup')

    spies.parseArgs.mockResolvedValueOnce(command)
    spies.syncToDb.mockResolvedValueOnce(undefined)
    spies.cleanup.mockResolvedValueOnce(undefined)

    const ctx = await cli.run()

    expect(mocks.logLevelSet).toHaveBeenNthCalledWith(1, 'info')
    expect(spies.syncToDb).toHaveBeenCalledWith(ctx)
    expect(spies.cleanup).toHaveBeenCalledWith(ctx)
  })

  test('run _sync with options', async () => {
    const command = makeCommand({ name: 'dump', options: { quiet: true, isDryRun: true } })
    spies.parseArgs = vi.spyOn(cli._private, '_parseArgs')
    spies.cleanup = vi.spyOn(cli._private, '_cleanup')
    spies.dump = vi.spyOn(cli._private, '_dump')

    spies.parseArgs.mockResolvedValueOnce(command)
    spies.dump.mockResolvedValueOnce(undefined)
    spies.cleanup.mockResolvedValueOnce(undefined)

    const ctx = await cli.run()

    expect(mocks.logLevelSet).toHaveBeenNthCalledWith(1, 'warn')
    expect(mocks.logChild).toHaveBeenCalledWith({ dryRun: true })
    expect(spies.dump).toHaveBeenCalledWith(ctx)
    expect(spies.cleanup).toHaveBeenCalledWith(ctx)
  })

  test('run _dump', async () => {
    const command = makeCommand({ name: 'dump' })
    spies.parseArgs = vi.spyOn(cli._private, '_parseArgs')
    spies.cleanup = vi.spyOn(cli._private, '_cleanup')
    spies.dump = vi.spyOn(cli._private, '_dump')

    spies.parseArgs.mockResolvedValueOnce(command)
    spies.dump.mockResolvedValueOnce(undefined)
    spies.cleanup.mockResolvedValueOnce(undefined)

    const ctx = await cli.run()

    expect(spies.dump).toHaveBeenCalledWith(ctx)
    expect(spies.cleanup).toHaveBeenCalledWith(ctx)
  })

  test('run _process', async () => {
    const command = makeCommand({ name: 'process' })
    spies.parseArgs = vi.spyOn(cli._private, '_parseArgs')
    spies.cleanup = vi.spyOn(cli._private, '_cleanup')
    spies.process = vi.spyOn(cli._private, '_process')

    spies.parseArgs.mockResolvedValueOnce(command)
    spies.process.mockResolvedValueOnce(undefined)
    spies.cleanup.mockResolvedValueOnce(undefined)

    const ctx = await cli.run()

    expect(spies.process).toHaveBeenCalledWith(ctx)
    expect(spies.cleanup).toHaveBeenCalledWith(ctx)
  })

  test('_cleanup', async () => {
    const ctx = makeContext()

    mocks.prisma$disconnect.mockResolvedValueOnce()

    await cli._private._cleanup(ctx)

    expect(prisma.$disconnect).toHaveBeenCalled()
  })

  test('_dumpBook', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook()
    const bookMd = bookFixtures.makeBookMd()

    mocks.bookToMd.mockResolvedValueOnce(bookMd)
    mocks.updateBookMd.mockResolvedValueOnce()
    mocks.cacheBook.mockResolvedValueOnce()

    await cli._private._dumpBook(ctx, book)

    expect(mocks.bookToMd).toHaveBeenCalledOnce()
    expect(mocks.logInfo).toHaveBeenCalled()
  })

  test('_dumpBook skips on dry run', async () => {
    const command = makeCommand({ options: { isDryRun: true } })
    const ctx = makeContext(command)
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
    const command = makeCommand()
    const ctx = makeContext(command)
    const books = [bookFixtures.makeBook(), bookFixtures.makeBook(), bookFixtures.makeBook()]
    spies.syncBookToDisk = vi.spyOn(cli._private, '_dumpBook')

    mocks.prismaBookFindMany.mockResolvedValue(books)
    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    spies.syncBookToDisk.mockResolvedValue(undefined)

    await cli._private._dump(ctx)

    expect(spies.syncBookToDisk).toHaveBeenCalledTimes(3)
  })

  test('_sync add books to db', async () => {
    const ctx = makeContext()
    const slugs = ['a', 'b']
    const bookMd = bookFixtures.makeBookMd()
    const cache = bookFixtures.makeBookCache()

    spies.addBookToDb = vi.spyOn(cli._private, '_syncAddBook')
    spies.updateBookToDb = vi.spyOn(cli._private, '_syncUpdateBook')
    spies.removeMissingBooksFromDb = vi.spyOn(cli._private, '_syncRemoveBooks')

    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugs)
    mocks.getBook.mockResolvedValue(bookMd)
    mocks.readBookDir.mockResolvedValueOnce(slugs)
    mocks.getBookCache.mockResolvedValue(cache)

    spies.removeMissingBooksFromDb.mockResolvedValueOnce(undefined)
    spies.addBookToDb.mockResolvedValue(undefined)

    await cli._private._sync(ctx)

    expect(mocks.getUpdatedSlugs).toHaveBeenCalledOnce()
    expect(spies.addBookToDb).toHaveBeenCalledTimes(slugs.length)
    expect(spies.updateBookToDb).not.toHaveBeenCalled()
    expect(spies.removeMissingBooksFromDb).toHaveBeenCalledOnce()
  })

  test('_sync updates books', async () => {
    const ctx = makeContext()
    const bookSlugs = ['a']
    const id = 'aslkjflksjf'
    const bookMd = bookFixtures.makeBookMd()
    spies.addBookToDb = vi.spyOn(cli._private, '_syncAddBook')
    spies.updateBookToDb = vi.spyOn(cli._private, '_syncUpdateBook')
    spies.removeMissingBooksFromDb = vi.spyOn(cli._private, '_syncRemoveBooks')
    const cache = bookFixtures.makeBookCache({
      database: { id, date_added: '', date_updated: '', slug: bookSlugs[0] },
    })

    mocks.getUpdatedSlugs.mockResolvedValueOnce(bookSlugs)
    mocks.getBook.mockResolvedValueOnce(bookMd)
    mocks.readBookDir.mockResolvedValueOnce(bookSlugs)
    mocks.getBookCache.mockResolvedValue(cache)

    spies.removeMissingBooksFromDb.mockResolvedValueOnce(undefined)
    spies.updateBookToDb.mockResolvedValue(undefined)

    await cli._private._sync(ctx)

    expect(mocks.getUpdatedSlugs).toHaveBeenCalledOnce()
    expect(spies.addBookToDb).not.toHaveBeenCalled()
    expect(spies.updateBookToDb).toHaveBeenCalledOnce()
    expect(spies.removeMissingBooksFromDb).toHaveBeenCalledWith(ctx, bookSlugs)
  })

  test('_sync force updates books', async () => {
    const command = makeCommand({ options: { force: true } })
    const ctx = makeContext(command)
    const bookSlugs = ['a']
    const id = 'aslkjflksjf'
    const bookMd = bookFixtures.makeBookMd()
    spies.addBookToDb = vi.spyOn(cli._private, '_syncAddBook')
    spies.updateBookToDb = vi.spyOn(cli._private, '_syncUpdateBook')
    spies.removeMissingBooksFromDb = vi.spyOn(cli._private, '_syncRemoveBooks')
    const cache = bookFixtures.makeBookCache({
      database: { id, date_added: '', date_updated: '', slug: bookSlugs[0] },
    })

    mocks.getBook.mockResolvedValueOnce(bookMd)
    mocks.readBookDir.mockResolvedValueOnce(bookSlugs)
    mocks.getBookCache.mockResolvedValue(cache)

    spies.removeMissingBooksFromDb.mockResolvedValueOnce(undefined)
    spies.updateBookToDb.mockResolvedValue(undefined)

    await cli._private._sync(ctx)

    expect(mocks.getUpdatedSlugs).not.toHaveBeenCalled()
    expect(spies.addBookToDb).not.toHaveBeenCalled()
    expect(spies.updateBookToDb).toHaveBeenCalledOnce()
    expect(spies.removeMissingBooksFromDb).toHaveBeenCalledWith(ctx, bookSlugs)
  })

  test('_sync skips on get book failure', async () => {
    const ctx = makeContext()
    const slugs = ['a', 'b']
    const cache = bookFixtures.makeBookCache()
    spies.addBookToDb = vi.spyOn(cli._private, '_syncAddBook')
    spies.updateBookToDb = vi.spyOn(cli._private, '_syncUpdateBook')
    spies.removeMissingBooksFromDb = vi.spyOn(cli._private, '_syncRemoveBooks')

    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugs)
    mocks.getBook.mockResolvedValue(null)
    mocks.readBookDir.mockResolvedValueOnce(slugs)
    mocks.getBookCache.mockResolvedValue(cache)

    spies.removeMissingBooksFromDb.mockResolvedValueOnce(undefined)
    spies.addBookToDb.mockResolvedValue(undefined)

    await cli._private._sync(ctx)

    expect(spies.addBookToDb).not.toHaveBeenCalled()
    expect(spies.updateBookToDb).not.toHaveBeenCalled()
    expect(spies.removeMissingBooksFromDb).toHaveBeenCalledOnce()
  })

  test('_syncRemoveBooksExecute', async () => {
    const ctx = makeContext()
    const slugs = [bookFixtures.makeBook().slug, bookFixtures.makeBook().slug]

    mocks.prismaBookDeleteMany.mockResolvedValueOnce({ count: slugs.length })

    await cli._private._syncRemoveBooksExecute(ctx, slugs)

    expect(mocks.prismaBookDeleteMany).toHaveBeenCalledWith({ where: { slug: { in: slugs } } })
  })

  test('_syncRemoveBooksExecute logs error', async () => {
    const ctx = makeContext()
    const slugs = [bookFixtures.makeBook().slug, bookFixtures.makeBook().slug]

    mocks.prismaBookDeleteMany.mockRejectedValueOnce(new Error('boom'))

    await cli._private._syncRemoveBooksExecute(ctx, slugs)

    expect(mocks.logError).toHaveBeenCalled()
  })

  test('_syncRemoveBooksExecute dry run', async () => {
    const command = makeCommand({ options: { isDryRun: true } })
    const ctx = makeContext(command)
    const slugs = [bookFixtures.makeBook().slug, bookFixtures.makeBook().slug]

    await cli._private._syncRemoveBooksExecute(ctx, slugs)

    expect(mocks.prismaBookDeleteMany).not.toHaveBeenCalled()
    expect(mocks.logInfo).toHaveBeenCalled()
  })

  test('_syncRemoveBooks', async () => {
    const ctx = makeContext()
    const books = [bookFixtures.makeBook({ slug: 'x' }), bookFixtures.makeBook({ slug: 'y' })]
    const slugsOnDisk = [books[0].slug]
    const slugsInDb = books.map((x) => x.slug)
    spies.removeMissingBooksFromDbExecute = vi.spyOn(cli._private, '_syncRemoveBooksExecute')

    mocks.prismaBookFindMany.mockResolvedValueOnce(books)
    spies.removeMissingBooksFromDbExecute.mockResolvedValueOnce(undefined)

    await cli._private._syncRemoveBooks(ctx, slugsOnDisk)

    expect(prisma.book.findMany).toHaveBeenCalled()
    expect(spies.removeMissingBooksFromDbExecute).toHaveBeenCalledTimes(
      slugsInDb.length - slugsOnDisk.length
    )
  })

  test('_syncRemoveBooks finds no books to delete', async () => {
    const ctx = makeContext()
    const books = [bookFixtures.makeBook(), bookFixtures.makeBook()]
    const slugsOnDisk = books.map((x) => x.slug)
    spies.removeMissingBooksFromDbExecute = vi.spyOn(cli._private, '_syncRemoveBooksExecute')

    mocks.prismaBookFindMany.mockResolvedValueOnce(books)
    spies.removeMissingBooksFromDbExecute.mockResolvedValueOnce(undefined)

    await cli._private._syncRemoveBooks(ctx, slugsOnDisk)

    expect(prisma.book.findMany).toHaveBeenCalled()
    expect(spies.removeMissingBooksFromDbExecute).not.toHaveBeenCalled()
  })

  test('_syncUpdateBookExecute', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook()
    const bookMd = bookFixtures.makeBookMd()
    const bookUpdate = { title: bookMd.frontmatter.title }

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(bookUpdate)
    mocks.prismaBookUpdate.mockResolvedValueOnce(book)
    mocks.cacheBook.mockResolvedValueOnce()

    await cli._private._syncUpdateBookExecute(ctx, bookMd, book)

    expect(mocks.bookMdToBookUpdateInput).toHaveBeenCalledWith(
      bookMd,
      book,
      ctx.command.options.dir
    )
    expect(mocks.prismaBookUpdate).toHaveBeenCalledWith({
      where: { id: book.id },
      data: bookUpdate,
    })
    expect(mocks.cacheBook).toHaveBeenCalled()
  })

  test('_syncUpdateBookExecute dry run', async () => {
    const command = makeCommand({ options: { isDryRun: true } })
    const ctx = makeContext(command)
    const book = bookFixtures.makeBook()
    const bookMd = bookFixtures.makeBookMd()
    const bookUpdate = { title: bookMd.frontmatter.title }

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(bookUpdate)

    await cli._private._syncUpdateBookExecute(ctx, bookMd, book)

    expect(mocks.bookMdToBookUpdateInput).not.toHaveBeenCalled()
    expect(mocks.prismaBookUpdate).not.toHaveBeenCalled()
    expect(mocks.cacheBook).not.toHaveBeenCalled()
  })

  test('_syncUpdateBookExecute logs error', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook()
    const bookMd = bookFixtures.makeBookMd()

    mocks.bookMdToBookUpdateInput.mockRejectedValueOnce(new Error('boom'))

    await cli._private._syncUpdateBookExecute(ctx, bookMd, book)

    expect(mocks.logError).toHaveBeenCalled()
  })

  test('_syncUpdateBook', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook()
    const bookMd = bookFixtures.makeBookMd()
    spies.updateBookToDbExecute = vi.spyOn(cli._private, '_syncUpdateBookExecute')

    mocks.prismaBookFindUnique.mockResolvedValueOnce(book)
    spies.updateBookToDbExecute.mockResolvedValueOnce(undefined)

    await cli._private._syncUpdateBook(ctx, bookMd, book.id)

    expect(mocks.prismaBookFindUnique).toHaveBeenCalledWith({ where: { id: book.id } })
    expect(spies.updateBookToDbExecute).toHaveBeenCalledWith(ctx, bookMd, book)
  })

  test('_syncUpdateBook logs error', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook()
    const bookMd = bookFixtures.makeBookMd()
    spies.updateBookToDbExecute = vi.spyOn(cli._private, '_syncUpdateBookExecute')

    mocks.prismaBookFindUnique.mockResolvedValueOnce(null)

    await cli._private._syncUpdateBook(ctx, bookMd, book.id)

    expect(spies.updateBookToDbExecute).not.toHaveBeenCalled()
    expect(mocks.logError).toHaveBeenCalled()
  })

  test('_syncAddBook', async () => {
    const ctx = makeContext()
    const bookMd = bookFixtures.makeBookMd()
    const bookAdd = bookFixtures.makeBook()
    spies.updateBook = vi.spyOn(cli._private, '_syncUpdateBookExecute')

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(bookAdd)
    mocks.prismaBookCreate.mockResolvedValueOnce(bookAdd)
    mocks.cacheBook.mockResolvedValueOnce()
    mocks.prismaBookFindUnique.mockResolvedValueOnce(null)

    await cli._private._syncAddBook(ctx, bookMd)

    expect(spies.updateBook).not.toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookCreateInput).toHaveBeenCalledWith(bookMd, ctx.command.options.dir)
    expect(mocks.prismaBookCreate).toHaveBeenCalledWith({
      data: bookAdd,
    })
    expect(mocks.cacheBook).toHaveBeenCalled()
  })

  test('_syncAddBook updates existing book', async () => {
    const ctx = makeContext()
    const bookMd = bookFixtures.makeBookMd()
    const bookAdd = bookFixtures.makeBook()
    spies.updateBook = vi.spyOn(cli._private, '_syncUpdateBookExecute')

    mocks.cacheBook.mockResolvedValueOnce()
    mocks.prismaBookFindUnique.mockResolvedValueOnce(bookAdd)

    await cli._private._syncAddBook(ctx, bookMd)

    expect(spies.updateBook).toHaveBeenCalledOnce()
    expect(mocks.bookMdToBookCreateInput).not.toHaveBeenCalled()
    expect(mocks.prismaBookCreate).not.toHaveBeenCalled()
  })

  test('_syncAddBook dry run', async () => {
    const command = makeCommand({ options: { isDryRun: true } })
    const ctx = makeContext(command)
    const bookMd = bookFixtures.makeBookMd()
    const bookAdd = bookFixtures.makeBook()

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(bookAdd)

    await cli._private._syncAddBook(ctx, bookMd)

    expect(mocks.bookMdToBookCreateInput).not.toHaveBeenCalled()
    expect(prisma.book.create).not.toHaveBeenCalled()
    expect(mocks.cacheBook).not.toHaveBeenCalled()
    expect(mocks.logInfo).toHaveBeenCalled()
  })

  test('_syncAddBook logs error', async () => {
    const ctx = makeContext()
    const bookMd = bookFixtures.makeBookMd()

    mocks.bookMdToBookCreateInput.mockRejectedValueOnce(new Error('boom'))

    await cli._private._syncAddBook(ctx, bookMd)

    expect(mocks.logError).toHaveBeenCalled()
  })

  test('_process', async () => {
    const ctx = makeContext()
    const bookMds = [bookFixtures.makeBookMd(), bookFixtures.makeBookMd()]
    const slugsOnDisk = bookMds.map((x) => path.basename(x.filename, '.md'))
    spies.onProcessBook = vi.spyOn(cli._private, '_processBook')

    mocks.readBookDir.mockResolvedValueOnce(slugsOnDisk)
    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugsOnDisk)
    mocks.getBook.mockResolvedValue(bookMds[0])
    mocks.cleanUpDerivatives.mockResolvedValueOnce()
    spies.onProcessBook.mockResolvedValue(undefined)

    await cli._private._process(ctx)

    expect(spies.onProcessBook).toHaveBeenCalledTimes(slugsOnDisk.length)
    expect(cleanUpDerivatives).toHaveBeenCalledOnce()
  })

  test('_process force', async () => {
    const command = makeCommand({ options: { force: true } })
    const ctx = makeContext(command)
    const bookMds = [bookFixtures.makeBookMd(), bookFixtures.makeBookMd()]
    const slugsOnDisk = bookMds.map((x) => path.basename(x.filename, '.md'))
    spies.onProcessBook = vi.spyOn(cli._private, '_processBook')

    mocks.readBookDir.mockResolvedValueOnce(slugsOnDisk)
    mocks.getBook.mockResolvedValue(bookMds[0])
    mocks.cleanUpDerivatives.mockResolvedValueOnce()
    spies.onProcessBook.mockResolvedValue(undefined)

    await cli._private._process(ctx)

    expect(mocks.getUpdatedSlugs).not.toHaveBeenCalled()
    expect(spies.onProcessBook).toHaveBeenCalledTimes(slugsOnDisk.length)
    expect(cleanUpDerivatives).toHaveBeenCalledOnce()
  })

  test('_process skips on getBook failure', async () => {
    const ctx = makeContext()
    const bookMds = [bookFixtures.makeBookMd(), bookFixtures.makeBookMd()]
    const slugsOnDisk = bookMds.map((x) => path.basename(x.filename, '.md'))
    spies.onProcessBook = vi.spyOn(cli._private, '_processBook')

    mocks.readBookDir.mockResolvedValueOnce(slugsOnDisk)
    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugsOnDisk)
    mocks.getBook.mockResolvedValue(null)
    mocks.cleanUpDerivatives.mockResolvedValueOnce()
    spies.onProcessBook.mockResolvedValue(undefined)

    await cli._private._process(ctx)

    expect(spies.onProcessBook).toHaveBeenCalledTimes(0)
    expect(cleanUpDerivatives).toHaveBeenCalledOnce()
  })

  test('_process skips on dry run', async () => {
    const command = makeCommand({ options: { isDryRun: true } })
    const ctx = makeContext(command)
    const bookMds = [bookFixtures.makeBookMd(), bookFixtures.makeBookMd()]
    const slugsOnDisk = bookMds.map((x) => path.basename(x.filename, '.md'))
    spies.onProcessBook = vi.spyOn(cli._private, '_processBook')

    mocks.readBookDir.mockResolvedValueOnce(slugsOnDisk)
    mocks.getUpdatedSlugs.mockResolvedValueOnce(slugsOnDisk)
    mocks.getBook.mockResolvedValue(bookMds[0])
    spies.onProcessBook.mockResolvedValue(undefined)

    await cli._private._process(ctx)

    expect(spies.onProcessBook).toHaveBeenCalledTimes(slugsOnDisk.length)
    expect(cleanUpDerivatives).not.toHaveBeenCalled()
  })

  test('_processBook', async () => {
    const ctx = makeContext()
    const bookMd = bookFixtures.makeBookMd()

    mocks.processBookMd.mockResolvedValueOnce(bookMd)
    mocks.updateBookMd.mockResolvedValueOnce()

    await cli._private._processBook(ctx, bookMd)

    expect(mocks.processBookMd).toHaveBeenCalledOnce()
    expect(mocks.updateBookMd).toHaveBeenCalledOnce()
  })

  test('_processBook skips on dry run', async () => {
    const command = makeCommand({ options: { isDryRun: true } })
    const ctx = makeContext(command)
    const bookMd = bookFixtures.makeBookMd()

    mocks.processBookMd.mockResolvedValueOnce(bookMd)
    mocks.updateBookMd.mockResolvedValueOnce()

    await cli._private._processBook(ctx, bookMd)

    expect(mocks.processBookMd).not.toHaveBeenCalledOnce()
    expect(mocks.updateBookMd).not.toHaveBeenCalledOnce()
  })

  test('_processBook logs error', async () => {
    const ctx = makeContext()
    const bookMd = bookFixtures.makeBookMd()

    mocks.processBookMd.mockRejectedValueOnce(new Error('boom'))

    await cli._private._processBook(ctx, bookMd)

    expect(mocks.logError).toHaveBeenCalledOnce()
  })

  test('_parseArgs', async () => {
    const args = ['sync', 'test-folder']
    const dirStats = { isDirectory: () => true } as Stats

    mocks.stat.mockResolvedValueOnce(dirStats)

    const command = await cli._private._parseArgs(args)

    expect(mocks.stat).toHaveBeenCalledWith(args[1])
    expect(command).toEqual({
      name: 'sync',
      options: {
        quiet: false,
        isDryRun: false,
        force: false,
        dir: args[1],
      },
    })
  })

  test('_parseArgs throws if dir is a file', async () => {
    const args = ['sync', 'test-folder']
    const dirStats = { isDirectory: () => false } as Stats
    const spyConsoleError = vi.spyOn(console, 'error')

    mocks.stat.mockResolvedValueOnce(dirStats)
    spyConsoleError.mockReturnValue()

    const command = cli._private._parseArgs(args)

    await expect(command).rejects.toThrow()
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
