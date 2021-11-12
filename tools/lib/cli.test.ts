import { mocked } from 'ts-jest/utils'
import { Command } from './cli'
import { CpuInfo, cpus } from 'os'
import { merge } from 'lodash'
import { Stats } from 'fs'
import { writeFile, readFile, utimes, stat } from 'fs/promises'
import prisma, { prismaClientMockReset } from './prisma.mock'
import {
  bookMdToBookCreateInput,
  bookMdToBookUpdateInput,
  BookMdWithDatabaseId,
  bookToString,
  extractBooksOnDisk,
  filterRecentlyUpdatedBooks,
  findNonExistantBooks,
  readBookDir,
} from './book'
import * as bookFixtures from './book.fixtures'
import log from './log'
import * as cli from './cli'
import { Book } from '@app/prisma'
import { DeepPartial } from 'src/@types/utilities'

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
  filterRecentlyUpdatedBooks: mocked(filterRecentlyUpdatedBooks),
  extractBooksOnDisk: mocked(extractBooksOnDisk),
  readBookDir: mocked(readBookDir),
  findNonExistantBooks: mocked(findNonExistantBooks),
  bookMdToBookUpdateInput: mocked(bookMdToBookUpdateInput),
  bookMdToBookCreateInput: mocked(bookMdToBookCreateInput),
}

function makeCommand(overrides?: DeepPartial<Command>): Command {
  return merge(
    {
      name: 'sync',
      options: {
        isDryRun: false,
        verbose: 0,
        dir: 'somewhere',
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
    const mockKeys = Object.keys(mocks) as (keyof typeof mocks)[]

    mockKeys.forEach((key) => {
      mocks[key].mockReset()
    })

    prismaClientMockReset()
    jest.restoreAllMocks()
  })

  test('run with defaults', async () => {
    const command = makeCommand()
    const spyParseArgs = jest.spyOn(cli, '_parseArgs')
    const spySyncToDb = jest.spyOn(cli, '_syncToDb')
    const spyCleanup = jest.spyOn(cli, '_cleanup')
    const spySyncToDisk = jest.spyOn(cli, '_syncToDisk')

    spyParseArgs.mockResolvedValueOnce(command)
    spySyncToDb.mockResolvedValueOnce()
    spyCleanup.mockResolvedValueOnce()

    const ctx = await cli.run()

    expect(log.level).toBe('info')
    expect(log.heading).toBe('')
    expect(spySyncToDb).toHaveBeenCalledWith(ctx)
    expect(spyCleanup).toHaveBeenCalledWith(ctx)
    expect(spySyncToDisk).not.toHaveBeenCalled()
  })

  test('run with overrides', async () => {
    const command = makeCommand({ name: 'dump', options: { verbose: 1, isDryRun: true } })
    const spyParseArgs = jest.spyOn(cli, '_parseArgs')
    const spySyncToDb = jest.spyOn(cli, '_syncToDb')
    const spyCleanup = jest.spyOn(cli, '_cleanup')
    const spySyncToDisk = jest.spyOn(cli, '_syncToDisk')

    spyParseArgs.mockResolvedValueOnce(command)
    spySyncToDisk.mockResolvedValueOnce()
    spyCleanup.mockResolvedValueOnce()

    const ctx = await cli.run()

    expect(log.level).toBe('silly')
    expect(log.heading).toBe('[would-have]')
    expect(spySyncToDisk).toHaveBeenCalledWith(ctx)
    expect(spyCleanup).toHaveBeenCalledWith(ctx)
    expect(spySyncToDb).not.toHaveBeenCalled()
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

  test('_syncBookToDiskExecute skips on dry run', async () => {
    const command = makeCommand({ options: { isDryRun: true } })
    const ctx = makeContext(command)
    const filepath = '/somewhere'
    const bookMdString = 'a book with metadata'
    const updated = new Date()

    await cli._syncBookToDiskExecute(ctx, filepath, bookMdString, updated)

    expect(log.info).toHaveBeenCalled()
  })

  test('_syncBookToDisk', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook({ date_updated: new Date() })
    const fileStat = { isFile: () => true } as Stats
    const fileString = 'book and metadata here'
    const bookToString = 'book and older metadata here'
    const filePath = `${ctx.command.options.dir}/${book.slug}.md`
    const spySyncBookToDiskExecute = jest.spyOn(cli, '_syncBookToDiskExecute')

    mocks.stat.mockResolvedValueOnce(fileStat)
    mocks.readFile.mockResolvedValueOnce(fileString)
    mocks.bookToString.mockResolvedValueOnce(bookToString)

    spySyncBookToDiskExecute.mockResolvedValueOnce()

    await cli._syncBookToDisk(ctx, book)

    expect(mocks.bookToString).toHaveBeenCalledWith(book)
    expect(mocks.stat).toHaveBeenCalledWith(filePath)
    expect(mocks.readFile).toHaveBeenCalledWith(filePath, 'utf-8')
    expect(spySyncBookToDiskExecute).toHaveBeenCalledWith(
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
    const spySyncBookToDiskExecute = jest.spyOn(cli, '_syncBookToDiskExecute')

    mocks.stat.mockResolvedValueOnce(fileStat)
    mocks.readFile.mockResolvedValueOnce(fileString)
    mocks.bookToString.mockResolvedValueOnce(bookToString)

    await cli._syncBookToDisk(ctx, book)

    expect(mocks.bookToString).toHaveBeenCalledWith(book)
    expect(mocks.stat).toHaveBeenCalledWith(filePath)
    expect(mocks.readFile).toHaveBeenCalledWith(filePath, 'utf-8')
    expect(spySyncBookToDiskExecute).not.toHaveBeenCalled()
  })

  test('_syncBookToDisk skips if directory found instead of a file', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook({ date_updated: new Date() })
    const fileStat = { isFile: () => false } as Stats
    const bookToString = 'something here'
    const filePath = `${ctx.command.options.dir}/${book.slug}.md`
    const spySyncBookToDiskExecute = jest.spyOn(cli, '_syncBookToDiskExecute')

    mocks.stat.mockResolvedValueOnce(fileStat)
    mocks.bookToString.mockResolvedValueOnce(bookToString)
    spySyncBookToDiskExecute.mockResolvedValueOnce()

    await cli._syncBookToDisk(ctx, book)

    expect(mocks.bookToString).toHaveBeenCalledWith(book)
    expect(mocks.stat).toHaveBeenCalledWith(filePath)
    expect(mocks.readFile).not.toHaveBeenCalled()
    expect(mocks.logError).toHaveBeenCalled()
    expect(spySyncBookToDiskExecute).not.toHaveBeenCalled()
  })

  test('_syncBookToDisk syncs if file does not exist', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook({ date_updated: new Date() })
    const bookToString = 'something here'
    const filePath = `${ctx.command.options.dir}/${book.slug}.md`
    const spySyncBookToDiskExecute = jest.spyOn(cli, '_syncBookToDiskExecute')

    mocks.stat.mockRejectedValueOnce(new Error('boom'))
    mocks.bookToString.mockResolvedValueOnce(bookToString)
    spySyncBookToDiskExecute.mockResolvedValueOnce()

    await cli._syncBookToDisk(ctx, book)

    expect(mocks.bookToString).toHaveBeenCalledWith(book)
    expect(mocks.stat).toHaveBeenCalledWith(filePath)
    expect(mocks.readFile).not.toHaveBeenCalled()
    expect(spySyncBookToDiskExecute).toHaveBeenCalledWith(
      ctx,
      filePath,
      bookToString,
      book.date_updated
    )
  })

  test('_syncBookToDisk skips syncs on dry run', async () => {
    const command = makeCommand({ options: { isDryRun: true } })
    const ctx = makeContext(command)
    const book = bookFixtures.makeBook({ date_updated: new Date() })
    const fileStat = { isFile: () => false } as Stats
    const bookToString = 'something here'
    const filePath = `${ctx.command.options.dir}/${book.slug}.md`
    const spySyncBookToDiskExecute = jest.spyOn(cli, '_syncBookToDiskExecute')

    mocks.stat.mockResolvedValueOnce(fileStat)
    mocks.bookToString.mockResolvedValueOnce(bookToString)

    await cli._syncBookToDisk(ctx, book)

    expect(mocks.bookToString).toHaveBeenCalledWith(book)
    expect(mocks.stat).toHaveBeenCalledWith(filePath)
    expect(mocks.readFile).not.toHaveBeenCalled()
    expect(spySyncBookToDiskExecute).toHaveBeenCalled()
  })

  test('_syncToDisk', async () => {
    const command = makeCommand()
    const ctx = makeContext(command)
    const books = [bookFixtures.makeBook(), bookFixtures.makeBook(), bookFixtures.makeBook()]
    const spySyncBookToDisk = jest.spyOn(cli, '_syncBookToDisk')

    prisma.book.findMany.mockResolvedValue(books)
    mocks.cpus.mockReturnValueOnce([{} as CpuInfo])
    spySyncBookToDisk.mockResolvedValue()

    await cli._syncToDisk(ctx)

    expect(prisma.book.findMany).toHaveBeenCalled()
    expect(spySyncBookToDisk).toHaveBeenCalledWith(ctx, books[0])
    expect(spySyncBookToDisk).toHaveBeenCalledWith(ctx, books[1])
    expect(spySyncBookToDisk).toHaveBeenCalledWith(ctx, books[2])
    expect(spySyncBookToDisk).toHaveBeenCalledTimes(3)
  })

  test('_syncToDb add books', async () => {
    const ctx = makeContext()
    const books = [bookFixtures.makeBook(), bookFixtures.makeBook(), bookFixtures.makeBook()]
    const bookSlugs = books.map((book) => book.slug)
    const bookMds = [bookFixtures.makeBookMd(), bookFixtures.makeBookMd()]
    const updatedBookSlugs = [books[0].slug, books[2].slug]
    const spyAddBookToDb = jest.spyOn(cli, '_addBookToDb')
    const spyRemoveMissingBooksFromDb = jest.spyOn(cli, '_removeMissingBooksFromDb')

    prisma.book.findMany.mockResolvedValueOnce(books)
    mocks.filterRecentlyUpdatedBooks.mockResolvedValueOnce([books[0].slug, books[1].slug])
    mocks.extractBooksOnDisk.mockResolvedValueOnce(bookMds)
    mocks.readBookDir.mockResolvedValueOnce(bookSlugs)
    spyRemoveMissingBooksFromDb.mockResolvedValueOnce()
    spyAddBookToDb.mockResolvedValue(undefined)

    await cli._syncToDb(ctx)

    expect(mocks.readBookDir).toHaveBeenCalledWith(ctx.command.options.dir)
    expect(prisma.book.findMany).toHaveBeenCalled()
    expect(mocks.filterRecentlyUpdatedBooks).toHaveBeenCalledWith(
      bookSlugs,
      books,
      ctx.command.options.dir
    )
    expect(mocks.extractBooksOnDisk).toHaveBeenCalledWith(updatedBookSlugs, ctx.command.options.dir)
    expect(spyAddBookToDb).toHaveBeenCalledWith(ctx, bookMds[0])
    expect(spyAddBookToDb).toHaveBeenCalledWith(ctx, bookMds[1])
    expect(spyRemoveMissingBooksFromDb).toHaveBeenCalledWith(ctx, bookSlugs)
  })

  test('_syncToDb updates books', async () => {
    const ctx = makeContext()
    const books = [bookFixtures.makeBook()]
    const bookSlugs = [books[0].slug]
    const id = 'aslkjflksjf'
    const bookMds = [bookFixtures.makeBookMd({ frontmatter: { __database_cache: { id } } })]
    const updatedBookSlugs = [books[0].slug]
    const spyUpdateBookToDb = jest.spyOn(cli, '_updateBookToDb')
    const spyRemoveMissingBooksFromDb = jest.spyOn(cli, '_removeMissingBooksFromDb')

    prisma.book.findMany.mockResolvedValueOnce(books)
    mocks.filterRecentlyUpdatedBooks.mockResolvedValueOnce(bookSlugs)
    mocks.extractBooksOnDisk.mockResolvedValueOnce(bookMds)
    mocks.readBookDir.mockResolvedValueOnce(bookSlugs)
    spyRemoveMissingBooksFromDb.mockResolvedValueOnce()
    spyUpdateBookToDb.mockResolvedValue()

    await cli._syncToDb(ctx)

    expect(mocks.readBookDir).toHaveBeenCalledWith(ctx.command.options.dir)
    expect(prisma.book.findMany).toHaveBeenCalled()
    expect(mocks.filterRecentlyUpdatedBooks).toHaveBeenCalledWith(
      bookSlugs,
      books,
      ctx.command.options.dir
    )
    expect(mocks.extractBooksOnDisk).toHaveBeenCalledWith(updatedBookSlugs, ctx.command.options.dir)
    expect(spyUpdateBookToDb).toHaveBeenCalledWith(ctx, bookMds[0])
    expect(spyRemoveMissingBooksFromDb).toHaveBeenCalledWith(ctx, bookSlugs)
  })

  test('_removeMissingBooksFromDbExecute', async () => {
    const ctx = makeContext()
    const books = [bookFixtures.makeBook(), bookFixtures.makeBook()]
    const ids = books.map((book) => book.id)

    prisma.book.deleteMany.mockResolvedValueOnce({ count: books.length })

    await cli._removeMissingBooksFromDbExecute(ctx, books)

    expect(prisma.book.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ids } } })
  })

  test('_removeMissingBooksFromDbExecute logs error', async () => {
    const ctx = makeContext()
    const books = [bookFixtures.makeBook(), bookFixtures.makeBook()]

    prisma.book.deleteMany.mockRejectedValueOnce(new Error('boom'))

    await cli._removeMissingBooksFromDbExecute(ctx, books)

    expect(mocks.logError).toHaveBeenCalled()
  })

  test('_removeMissingBooksFromDbExecute dry run', async () => {
    const command = makeCommand({ options: { isDryRun: true } })
    const ctx = makeContext(command)
    const books = [bookFixtures.makeBook(), bookFixtures.makeBook()]

    await cli._removeMissingBooksFromDbExecute(ctx, books)

    expect(prisma.book.deleteMany).not.toHaveBeenCalled()
    expect(mocks.logInfo).toHaveBeenCalled()
  })

  test('_removeMissingBooksFromDb', async () => {
    const ctx = makeContext()
    const books = [bookFixtures.makeBook(), bookFixtures.makeBook()]
    const booksToRemove = [books[1]]
    const bookSlugs = booksToRemove.map((book) => book.slug)
    const spyRemoveMissingBooksFromDbExecute = jest.spyOn(cli, '_removeMissingBooksFromDbExecute')

    prisma.book.findMany.mockResolvedValueOnce(books)
    spyRemoveMissingBooksFromDbExecute.mockResolvedValueOnce()
    mocks.findNonExistantBooks.mockReturnValueOnce(booksToRemove)

    await cli._removeMissingBooksFromDb(ctx, bookSlugs)

    expect(prisma.book.findMany).toHaveBeenCalled()
    expect(mocks.findNonExistantBooks).toHaveBeenCalledWith(bookSlugs, books)
    expect(spyRemoveMissingBooksFromDbExecute).toHaveBeenCalledWith(ctx, booksToRemove)
  })

  test('_removeMissingBooksFromDb finds no books to delete', async () => {
    const ctx = makeContext()
    const books = [bookFixtures.makeBook(), bookFixtures.makeBook()]
    const booksToRemove: Book[] = []
    const bookSlugs = booksToRemove.map((book) => book.slug)
    const spyRemoveMissingBooksFromDbExecute = jest.spyOn(cli, '_removeMissingBooksFromDbExecute')

    prisma.book.findMany.mockResolvedValueOnce(books)
    spyRemoveMissingBooksFromDbExecute.mockResolvedValueOnce()
    mocks.findNonExistantBooks.mockReturnValueOnce(booksToRemove)

    await cli._removeMissingBooksFromDb(ctx, bookSlugs)

    expect(prisma.book.findMany).toHaveBeenCalled()
    expect(mocks.findNonExistantBooks).toHaveBeenCalledWith(bookSlugs, books)
    expect(spyRemoveMissingBooksFromDbExecute).not.toHaveBeenCalled()
  })

  test('_updateBookToDbExecute', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook()
    const bookMd = bookFixtures.makeBookMd()
    const bookString = 'xyz'
    const bookUpdate = { title: bookMd.frontmatter.title }
    const filePath = `${ctx.command.options.dir}/${bookMd.filename}`

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(bookUpdate)
    prisma.book.update.mockResolvedValueOnce(book)
    mocks.bookToString.mockResolvedValueOnce(bookString)
    mocks.writeFile.mockResolvedValueOnce()
    mocks.utimes.mockResolvedValueOnce()

    await cli._updateBookToDbExecute(ctx, bookMd, book)

    expect(mocks.bookMdToBookUpdateInput).toHaveBeenCalledWith(
      bookMd,
      book,
      ctx.command.options.dir
    )
    expect(prisma.book.update).toHaveBeenCalledWith({
      where: { id: book.id },
      data: bookUpdate,
    })
    expect(mocks.bookToString).toHaveBeenCalledWith(book)
    expect(mocks.writeFile).toHaveBeenCalledWith(filePath, bookString)
    expect(mocks.utimes).toHaveBeenCalledWith(filePath, book.date_updated, book.date_updated)
  })

  test('_updateBookToDbExecute dry run', async () => {
    const command = makeCommand({ options: { isDryRun: true } })
    const ctx = makeContext(command)
    const book = bookFixtures.makeBook()
    const bookMd = bookFixtures.makeBookMd()
    const bookUpdate = { title: bookMd.frontmatter.title }

    mocks.bookMdToBookUpdateInput.mockResolvedValueOnce(bookUpdate)

    await cli._updateBookToDbExecute(ctx, bookMd, book)

    expect(mocks.bookMdToBookUpdateInput).toHaveBeenCalledWith(
      bookMd,
      book,
      ctx.command.options.dir
    )
    expect(prisma.book.update).not.toHaveBeenCalled()
    expect(mocks.bookToString).not.toHaveBeenCalled()
    expect(mocks.writeFile).not.toHaveBeenCalled()
    expect(mocks.utimes).not.toHaveBeenCalled()
  })

  test('_updateBookToDbExecute logs error', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook()
    const bookMd = bookFixtures.makeBookMd()

    mocks.bookMdToBookUpdateInput.mockRejectedValueOnce(new Error('boom'))

    await cli._updateBookToDbExecute(ctx, bookMd, book)

    expect(mocks.logError).toHaveBeenCalled()
  })

  test('_updateBookToDb', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook()
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __database_cache: { id: book.id } } })
    const spyUpdateBookToDbExecute = jest.spyOn(cli, '_updateBookToDbExecute')

    prisma.book.findUnique.mockResolvedValueOnce(book)
    spyUpdateBookToDbExecute.mockResolvedValueOnce()

    await cli._updateBookToDb(ctx, bookMd as BookMdWithDatabaseId)

    expect(prisma.book.findUnique).toHaveBeenCalledWith({ where: { id: book.id } })
    expect(spyUpdateBookToDbExecute).toHaveBeenCalledWith(ctx, bookMd, book)
  })

  test('_updateBookToDb logs error', async () => {
    const ctx = makeContext()
    const book = bookFixtures.makeBook()
    const bookMd = bookFixtures.makeBookMd({ frontmatter: { __database_cache: { id: book.id } } })
    const spyUpdateBookToDbExecute = jest.spyOn(cli, '_updateBookToDbExecute')

    prisma.book.findUnique.mockResolvedValueOnce(null)

    await cli._updateBookToDb(ctx, bookMd as BookMdWithDatabaseId)

    expect(spyUpdateBookToDbExecute).not.toHaveBeenCalled()
    expect(mocks.logError).toHaveBeenCalled()
  })

  test('_addBookToDbExecute', async () => {
    const ctx = makeContext()
    const bookMd = bookFixtures.makeBookMd()
    const bookAdd = bookFixtures.makeBook()
    const bookString = 'xyz'
    const filePath = `${ctx.command.options.dir}/${bookMd.filename}`

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(bookAdd)
    prisma.book.create.mockResolvedValueOnce(bookAdd)
    mocks.bookToString.mockResolvedValueOnce(bookString)
    mocks.writeFile.mockResolvedValueOnce()
    mocks.utimes.mockResolvedValueOnce()

    await cli._addBookToDbExecute(ctx, bookMd)

    expect(mocks.bookMdToBookCreateInput).toHaveBeenCalledWith(bookMd, ctx.command.options.dir)
    expect(prisma.book.create).toHaveBeenCalledWith({
      data: bookAdd,
    })
    expect(mocks.bookToString).toHaveBeenCalledWith(bookAdd)
    expect(mocks.writeFile).toHaveBeenCalledWith(filePath, bookString)
    expect(mocks.utimes).toHaveBeenCalledWith(filePath, bookAdd.date_updated, bookAdd.date_updated)
  })

  test('_addBookToDbExecute dry run', async () => {
    const command = makeCommand({ options: { isDryRun: true } })
    const ctx = makeContext(command)
    const bookMd = bookFixtures.makeBookMd()
    const bookAdd = bookFixtures.makeBook()

    mocks.bookMdToBookCreateInput.mockResolvedValueOnce(bookAdd)

    await cli._addBookToDbExecute(ctx, bookMd)

    expect(mocks.bookMdToBookCreateInput).toHaveBeenCalledWith(bookMd, ctx.command.options.dir)
    expect(prisma.book.create).not.toHaveBeenCalled()
    expect(mocks.bookToString).not.toHaveBeenCalled()
    expect(mocks.writeFile).not.toHaveBeenCalled()
    expect(mocks.utimes).not.toHaveBeenCalled()
    expect(mocks.logInfo).toHaveBeenCalled()
  })

  test('_addBookToDbExecute logs error', async () => {
    const ctx = makeContext()
    const bookMd = bookFixtures.makeBookMd()

    mocks.bookMdToBookCreateInput.mockRejectedValueOnce(new Error('boom'))

    await cli._addBookToDbExecute(ctx, bookMd)

    expect(mocks.logError).toHaveBeenCalled()
  })

  test('_addBookToDb', async () => {
    const ctx = makeContext()
    const bookMd = bookFixtures.makeBookMd()
    const spyAddBookToDbExecute = jest.spyOn(cli, '_addBookToDbExecute')

    spyAddBookToDbExecute.mockResolvedValueOnce()

    await cli._addBookToDb(ctx, bookMd)

    expect(spyAddBookToDbExecute).toHaveBeenCalledWith(ctx, bookMd)
  })

  test('_parseArgs', async () => {
    const args = ['sync', 'test-folder']
    const dirStats = { isDirectory: () => true } as Stats

    mocks.stat.mockResolvedValueOnce(dirStats)

    const command = await cli._parseArgs(args)

    expect(mocks.stat).toHaveBeenCalledWith(args[1])
    expect(command).toEqual({
      name: 'sync',
      options: {
        verbose: 0,
        isDryRun: false,
        dir: args[1],
      },
    })
  })

  test('_parseArgs throws if dir is a file', async () => {
    const args = ['sync', 'test-folder']
    const dirStats = { isDirectory: () => false } as Stats
    const spyConsoleError = jest.spyOn(console, 'error')
    const spyProcessExit = jest.spyOn(process, 'exit')

    mocks.stat.mockResolvedValueOnce(dirStats)
    spyConsoleError.mockImplementation()
    spyProcessExit.mockImplementation()

    const command = cli._parseArgs(args)

    await expect(command).rejects.toThrow()
    expect(spyProcessExit).toHaveBeenCalledWith(1)
  })

  test('_parseArgs throws if dir does not exist', async () => {
    const args = ['sync', 'test-folder']
    const spyConsoleError = jest.spyOn(console, 'error')
    const spyProcessExit = jest.spyOn(process, 'exit')

    mocks.stat.mockRejectedValueOnce(new Error('boom'))
    spyConsoleError.mockImplementation()
    spyProcessExit.mockImplementation()

    const command = cli._parseArgs(args)

    await expect(command).rejects.toThrow()
    expect(spyProcessExit).toHaveBeenCalledWith(1)
  })

  test('_parseArgs throws if command does not exist', async () => {
    const args = ['boom', 'test-folder']
    const dirStats = { isDirectory: () => true } as Stats
    const spyConsoleError = jest.spyOn(console, 'error')
    const spyProcessExit = jest.spyOn(process, 'exit')

    mocks.stat.mockResolvedValueOnce(dirStats)
    spyConsoleError.mockImplementation()
    spyProcessExit.mockImplementation()

    await cli._parseArgs(args)

    expect(spyProcessExit).toHaveBeenCalledWith(1)
  })
})
