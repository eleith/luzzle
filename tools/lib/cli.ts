import { Book, PrismaClient } from '@app/prisma'
import prisma from './prisma'
import { eachLimit } from 'async'
import { writeFile, utimes, readFile, stat } from 'fs/promises'
import { cpus } from 'os'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import {
  BookMd,
  bookMdToBookCreateInput,
  bookMdToBookUpdateInput,
  BookMdWithDatabaseId,
  bookToString,
  extractBooksOnDisk,
  filterRecentlyUpdatedBooks,
  findNonExistantBooks,
  readBookDir,
} from './book'
import log from './log'
import { Logger } from 'npmlog'

export type Command = {
  options: {
    verbose: number
    isDryRun: boolean
    dir: string
  }
  name: 'sync' | 'dump'
}

export type Context = {
  prisma: PrismaClient
  log: Logger
  command: Command
}

export const _parseArgs = async (_args: string[]): Promise<Command> => {
  const command = await yargs(_args)
    .strict()
    .command('sync <dir>', 'sync directory to local database')
    .command('dump <dir>', 'dump database to local markdown files')
    .positional('dir', {
      type: 'string',
      description: 'directory for the book entries',
      demandOption: 'a directory containing book entries must be provided',
    })
    .options({
      'dry-run': {
        type: 'boolean',
        description: 'run without making permanent changes',
        default: false,
      },
      verbose: {
        alias: 'v',
        type: 'count',
      },
    })
    .check(async (args) => {
      const dirStat = await stat(args.dir).catch(() => null)

      if (args.dir && !dirStat?.isDirectory()) {
        throw new Error(`[error] '${args.dir}' is not a folder`)
      }

      return true
    })
    .demandCommand(1, `[error] please specify a command`)
    .parseAsync()

  return {
    name: command._[0] as 'sync' | 'dump',
    options: {
      verbose: command.verbose,
      isDryRun: command['dry-run'],
      dir: command.dir,
    },
  }
}

export const _addBookToDb = async (ctx: Context, bookMd: BookMd): Promise<void> => {
  await _addBookToDbExecute(ctx, bookMd)
}

export const _addBookToDbExecute = async (ctx: Context, bookMd: BookMd): Promise<void> => {
  const filename = bookMd.filename
  const filepath = path.join(ctx.command.options.dir, filename)

  try {
    const bookCreateInput = await bookMdToBookCreateInput(bookMd, ctx.command.options.dir)
    if (ctx.command.options.isDryRun === false) {
      const bookAdded = await ctx.prisma.book.create({ data: bookCreateInput })
      const bookMdString = await bookToString(bookAdded)

      await writeFile(filepath, bookMdString)
      await utimes(filepath, bookAdded.date_updated, bookAdded.date_updated)
    }
    log.info('[db]', `added ${bookMd.filename}`)
  } catch (err) {
    log.error('[db]', err as string)
  }
}

export const _updateBookToDb = async (
  ctx: Context,
  bookMd: BookMdWithDatabaseId
): Promise<void> => {
  const id = bookMd.frontmatter.__database_cache.id
  const book = await ctx.prisma.book.findUnique({ where: { id } })

  if (book) {
    await _updateBookToDbExecute(ctx, bookMd, book)
    return
  }

  log.error('[db]', `${bookMd.filename} pointed to non-existant ${id}`)
}

export const _updateBookToDbExecute = async (
  ctx: Context,
  bookMd: BookMd,
  book: Book
): Promise<void> => {
  const filename = bookMd.filename
  const filepath = path.join(ctx.command.options.dir, filename)

  try {
    const bookUpdateInput = await bookMdToBookUpdateInput(bookMd, book, ctx.command.options.dir)

    if (ctx.command.options.isDryRun === false) {
      const bookUpdate = await ctx.prisma.book.update({
        where: { id: book.id },
        data: bookUpdateInput,
      })
      const bookMdString = await bookToString(bookUpdate)
      await writeFile(filepath, bookMdString)
      await utimes(filepath, bookUpdate.date_updated, bookUpdate.date_updated)
    }

    log.info('[db-disk]', `updated ${book.slug}`)
  } catch (err) {
    log.error('[db]', err as string)
  }
}

export const _removeMissingBooksFromDb = async (
  ctx: Context,
  bookSlugs: string[]
): Promise<void> => {
  const booksInDb = await ctx.prisma.book.findMany({ select: { id: true, slug: true } })
  const booksToRemove = findNonExistantBooks(bookSlugs, booksInDb)

  if (booksToRemove.length) {
    await _removeMissingBooksFromDbExecute(ctx, booksToRemove)
  }
}

export const _removeMissingBooksFromDbExecute = async (
  ctx: Context,
  books: Pick<Book, 'id' | 'slug'>[]
): Promise<void> => {
  try {
    if (ctx.command.options.isDryRun === false) {
      const ids = books.map((book) => book.id)
      await ctx.prisma.book.deleteMany({ where: { id: { in: ids } } })
    }
    log.info('[db]', `deleted ${books.map((book) => book.slug)}`)
  } catch (err) {
    log.error('[db]', err as string)
  }
}

export const _syncToDb = async (ctx: Context): Promise<void> => {
  const bookSlugs = await readBookDir(ctx.command.options.dir)
  const books = await ctx.prisma.book.findMany({ select: { date_updated: true, slug: true } })
  const updatedBookSlugs = await filterRecentlyUpdatedBooks(
    bookSlugs,
    books,
    ctx.command.options.dir
  )
  const bookMds = await extractBooksOnDisk(updatedBookSlugs, ctx.command.options.dir)

  await eachLimit(bookMds, 1, async (bookMd) => {
    if (bookMd.frontmatter.__database_cache?.id) {
      await _updateBookToDb(ctx, bookMd as BookMdWithDatabaseId)
    } else {
      await _addBookToDb(ctx, bookMd)
    }
  })

  await _removeMissingBooksFromDb(ctx, bookSlugs)
}

export const _syncToDisk = async (ctx: Context): Promise<void> => {
  const books = await ctx.prisma.book.findMany()

  await eachLimit(books, cpus().length, async (book) => {
    await _syncBookToDisk(ctx, book)
  })
}

export const _syncBookToDisk = async (ctx: Context, book: Book): Promise<void> => {
  const bookMd = await bookToString(book)
  const file = path.join(ctx.command.options.dir, `${book.slug}.md`)
  const fileStat = await stat(file).catch(() => null)

  if (fileStat?.isFile()) {
    const currentBookMdString = await readFile(
      path.join(ctx.command.options.dir, `${book.slug}.md`),
      'utf-8'
    )
    if (currentBookMdString === bookMd) {
      return
    }
  } else if (fileStat) {
    log.error('[disk]', `${file} isn't a file`)
    return
  }

  await _syncBookToDiskExecute(ctx, file, bookMd, book.date_updated)
}

export const _syncBookToDiskExecute = async (
  ctx: Context,
  filepath: string,
  bookMdString: string,
  updated: Date
): Promise<void> => {
  try {
    if (!ctx.command.options.isDryRun) {
      await writeFile(filepath, bookMdString)
      await utimes(filepath, updated, updated)
    }
    log.info('[disk]', `wrote to ${filepath}`)
  } catch (err) {
    log.error('[disk]', err as string)
  }
}

export const _cleanup = async (ctx: Context): Promise<void> => {
  await ctx.prisma.$disconnect()
}

async function run(): Promise<Context> {
  const command = await _parseArgs(hideBin(process.argv))
  const ctx: Context = {
    prisma,
    log,
    command,
  }

  ctx.log.level = command.options.verbose === 0 ? 'info' : 'silly'
  ctx.log.heading = command.options.isDryRun ? '[would-have]' : ''

  if (ctx.command.name === 'dump') {
    await _syncToDisk(ctx)
  } else {
    await _syncToDb(ctx)
  }

  await _cleanup(ctx)

  return ctx
}

export { run }
