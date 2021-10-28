import { Book, PrismaClient } from '@app/prisma'
import prisma from './prisma'
import { eachLimit } from 'async'
import { existsSync, promises } from 'fs'
import { cpus } from 'os'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import {
  BookMd,
  bookMdToBookCreateInput,
  bookMdToBookUpdateInput,
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

export const _parseArgs = (args: string[]): Command => {
  const command = yargs(args)
    .command('sync <dir>', 'sync directory to local database')
    .command('dump <dir>', 'dump database to local markdown files')
    .positional('dir', {
      type: 'string',
      description: 'directory for the book entries',
      demandOption: true,
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
    .check((args) => {
      if (args.dir && !existsSync(args.dir)) {
        throw new Error(`[error] '${args.dir}' is not a folder`)
      }

      if (['sync', 'dump'].indexOf(args._[0] as string) == -1) {
        throw new Error(`[error] '${args._}' is not a valid command`)
      }

      return true
    })
    .demandCommand(1, `[error] please specify a command`)
    .parseSync()

  return {
    name: command._[0] as 'sync' | 'dump',
    options: {
      verbose: command.verbose,
      isDryRun: command['dry-run'],
      dir: command.dir,
    },
  }
}

export const _addBookToDb = async (ctx: Context, bookMd: BookMd): Promise<unknown> => {
  const err = ctx.command.options.isDryRun ? null : await _addBookToDbExecute(ctx, bookMd)

  if (!err) {
    log.info('[db]', `added ${bookMd.filename}`)
    log.info('[disk]', `synced db cache to ${bookMd.filename}`)
  } else {
    log.error('[db]', err as string)
  }

  return err
}

export const _addBookToDbExecute = async (ctx: Context, bookMd: BookMd): Promise<unknown> => {
  const filename = bookMd.filename
  const filepath = path.join(ctx.command.options.dir, filename)

  try {
    const bookCreateInput = await bookMdToBookCreateInput(bookMd, ctx.command.options.dir)
    const bookAdded = await ctx.prisma.book.create({ data: bookCreateInput })
    const bookMdString = await bookToString(bookAdded)

    await promises.writeFile(filepath, bookMdString)
    await promises.utimes(filepath, bookAdded.date_updated, bookAdded.date_updated)
  } catch (err) {
    return err
  }
}

export const _updateBookToDb = async (ctx: Context, bookMd: BookMd): Promise<unknown> => {
  const id = bookMd.frontmatter.__database_cache?.id
  const book = await ctx.prisma.book.findUnique({ where: { id } })

  if (book) {
    const err = ctx.command.options.isDryRun
      ? null
      : await _updateBookToDbExecute(ctx, bookMd, book)

    if (!err) {
      log.info('[db]', `updated ${bookMd.filename}`)
      log.info('[disk]', `synced db cache ${bookMd.filename}`)
    } else {
      log.error('[db]', err as string)
    }
    return err
  }

  return new Error(`${bookMd.filename} pointed to non-existant ${id}`)
}

export const _updateBookToDbExecute = async (
  ctx: Context,
  bookMd: BookMd,
  book: Book
): Promise<unknown> => {
  const filename = bookMd.filename
  const filepath = path.join(ctx.command.options.dir, filename)

  try {
    const bookUpdateInput = await bookMdToBookUpdateInput(bookMd, book, ctx.command.options.dir)
    const bookUpdate = await ctx.prisma.book.update({
      where: { id: book.id },
      data: bookUpdateInput,
    })
    const bookMdString = await bookToString(bookUpdate)
    await promises.writeFile(filepath, bookMdString)
    await promises.utimes(filepath, bookUpdate.date_updated, bookUpdate.date_updated)
  } catch (err) {
    return err
  }
}

export const _removeBookFromDb = async (ctx: Context, bookSlugs: string[]): Promise<unknown> => {
  const booksInDb = await ctx.prisma.book.findMany({ select: { id: true, slug: true } })
  const booksToRemove = findNonExistantBooks(bookSlugs, booksInDb)
  const ids = booksToRemove.map((book) => book.id)

  if (ids.length) {
    const err = ctx.command.options.isDryRun ? null : await _removeBookFromDbExecute(ctx, ids)

    if (!err) {
      log.info('[db]', `deleted ${booksToRemove.map((book) => book.slug)}`)
    } else {
      log.error('[db]', err as string)
    }
    return err
  }
}

export const _removeBookFromDbExecute = async (ctx: Context, ids: string[]): Promise<unknown> => {
  try {
    await ctx.prisma.book.deleteMany({ where: { id: { in: ids } } })
  } catch (err) {
    return err
  }
}

export const _syncToDb = async (ctx: Context): Promise<void> => {
  const bookSlugs = await readBookDir(ctx.command.options.dir)
  const books = await ctx.prisma.book.findMany({ select: { date_updated: true, slug: true } })
  const updatedBookFiles = await filterRecentlyUpdatedBooks(
    bookSlugs,
    books,
    ctx.command.options.dir
  )
  const bookMds = await extractBooksOnDisk(updatedBookFiles, ctx.command.options.dir)
  const errors: unknown[] = []

  await eachLimit(bookMds, 1, async (bookMd) => {
    if (bookMd.frontmatter.__database_cache?.id) {
      const err = await _updateBookToDb(ctx, bookMd)
      errors.push(err)
    } else {
      const err = await _addBookToDb(ctx, bookMd)
      errors.push(err)
    }
  })

  if (errors.length === 0) {
    await _removeBookFromDb(ctx, bookSlugs)
  }
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
  const exists = existsSync(file)

  if (exists) {
    const currentBookMdString = await promises.readFile(
      path.join(ctx.command.options.dir, `${book.slug}.md`),
      'utf-8'
    )
    if (currentBookMdString === bookMd) {
      return
    }
  }

  const err = ctx.command.options.isDryRun
    ? null
    : await _syncBookToDiskExecute(ctx, file, bookMd, book.date_updated)

  if (!err) {
    log.info('[disk]', `wrote ${file}`)
  } else {
    log.error('[disk]', err as string)
  }
}

export const _syncBookToDiskExecute = async (
  _: Context,
  filepath: string,
  bookMd: string,
  updated: Date
): Promise<unknown> => {
  try {
    await promises.writeFile(filepath, bookMd)
    await promises.utimes(filepath, updated, updated)
  } catch (err) {
    return err
  }
}

export const _cleanup = async (ctx: Context): Promise<void> => {
  await ctx.prisma.$disconnect()
}

async function run(): Promise<Context> {
  const command = _parseArgs(hideBin(process.argv))
  const ctx: Context = {
    prisma,
    log,
    command,
  }

  ctx.log.level = command.options.verbose === 0 ? 'info' : 'silly'
  ctx.log.heading = command.options.isDryRun ? '[would-have]' : ''

  if (ctx.command.name === 'dump') {
    await _syncToDisk(ctx)
  } else if (ctx.command.name === 'sync') {
    await _syncToDb(ctx)
  }

  await _cleanup(ctx)

  return ctx
}

export { run }
