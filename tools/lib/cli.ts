import { Book, PrismaClient } from '@app/prisma'
import prisma from './prisma'
import { eachLimit } from 'async'
import { stat } from 'fs/promises'
import { cpus } from 'os'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import {
  BookMd,
  bookMdToBookCreateInput,
  bookMdToBookUpdateInput,
  getBook,
  processBookMd,
  readBookDir,
  getUpdatedSlugs,
  cleanUpDerivatives,
  updateBookMd,
  cacheBook,
  getBookCache,
  getSlugFromBookMd,
  bookToMd,
} from './book'
import log from './log'
import { difference } from 'lodash'
import { Logger } from 'pino'

export type Command = {
  options: {
    quiet: boolean
    isDryRun: boolean
    dir: string
    force: boolean
  }
  name: 'sync' | 'dump' | 'process'
}

export type Context = {
  prisma: PrismaClient
  log: Logger
  command: Command
}

async function _parseArgs(_args: string[]): Promise<Command> {
  const command = await yargs(_args)
    .strict()
    .command('sync <dir>', 'sync directory to local database')
    .command('dump <dir>', 'dump database to local markdown files')
    .command('process <dir>', 'process local markdown files for cleaning')
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
      force: {
        type: 'boolean',
        alias: 'f',
        description: 'force updates on all entries',
        default: false,
      },
      quiet: {
        alias: 'q',
        type: 'boolean',
        default: false,
      },
    })
    .check(async (args) => {
      const dirStat = await stat(args.dir).catch(() => null)

      if (args.dir && !dirStat?.isDirectory()) {
        throw new Error(`[error] '${args.dir}' is not a folder`)
      }

      return true
    })
    .exitProcess(false)
    .demandCommand(1, `[error] please specify a command`)
    .parseAsync()

  return {
    name: command._[0] as 'sync' | 'dump',
    options: {
      quiet: command.quiet,
      isDryRun: command['dry-run'],
      force: command.force,
      dir: command.dir,
    },
  }
}

async function _processBook(ctx: Context, bookMd: BookMd): Promise<void> {
  const dir = ctx.command.options.dir

  try {
    if (ctx.command.options.isDryRun === false) {
      const bookProcessed = await processBookMd(bookMd, dir)
      await updateBookMd(bookProcessed, dir)
    }
    log.info(`processed ${bookMd.filename}`)
  } catch (err) {
    log.error(err as string)
  }
}

async function _syncAddBook(ctx: Context, bookMd: BookMd): Promise<void> {
  const maybeBook = await ctx.prisma.book.findUnique({ where: { slug: getSlugFromBookMd(bookMd) } })

  if (maybeBook) {
    await _private._syncUpdateBookExecute(ctx, bookMd, maybeBook)
    return
  }

  try {
    if (ctx.command.options.isDryRun === false) {
      const bookCreateInput = await bookMdToBookCreateInput(bookMd, ctx.command.options.dir)
      const bookAdded = await ctx.prisma.book.create({ data: bookCreateInput })

      await cacheBook(bookAdded, ctx.command.options.dir)
    }
    log.info(`added ${bookMd.filename}`)
  } catch (err) {
    log.error(err as string)
  }
}

async function _syncUpdateBook(ctx: Context, bookMd: BookMd, id: string): Promise<void> {
  const book = await ctx.prisma.book.findUnique({ where: { id } })

  if (book) {
    await _private._syncUpdateBookExecute(ctx, bookMd, book)
    return
  }

  log.error(`${bookMd.filename} pointed to non-existant ${id}`)
}

async function _syncUpdateBookExecute(ctx: Context, bookMd: BookMd, book: Book): Promise<void> {
  const dir = ctx.command.options.dir
  try {
    if (ctx.command.options.isDryRun === false) {
      const bookUpdateInput = await bookMdToBookUpdateInput(bookMd, book, dir)
      const bookUpdate = await ctx.prisma.book.update({
        where: { id: book.id },
        data: bookUpdateInput,
      })
      await cacheBook(bookUpdate, dir)
    }

    log.info(`updated ${book.slug}`)
  } catch (err) {
    log.error(err as string)
  }
}

async function _syncRemoveBooks(ctx: Context, diskSlugs: string[]): Promise<void> {
  const booksInDb = await ctx.prisma.book.findMany({ select: { slug: true } })
  const dbSlugs = booksInDb.map((book) => book.slug)
  const booksToRemove = difference(dbSlugs, diskSlugs)

  if (booksToRemove.length) {
    await _private._syncRemoveBooksExecute(ctx, booksToRemove)
  }
}

async function _syncRemoveBooksExecute(ctx: Context, slugs: string[]): Promise<void> {
  try {
    if (ctx.command.options.isDryRun === false) {
      await ctx.prisma.book.deleteMany({ where: { slug: { in: slugs } } })
    }
    log.info(`deleted ${slugs.join(', ')}`)
  } catch (err) {
    log.error(err as string)
  }
}

async function _sync(ctx: Context): Promise<void> {
  const bookSlugs = await readBookDir(ctx.command.options.dir)
  const dir = ctx.command.options.dir
  const force = ctx.command.options.force
  const updatedBookSlugs = force ? bookSlugs : await getUpdatedSlugs(bookSlugs, dir, 'lastSynced')

  await eachLimit(updatedBookSlugs, 1, async (slug) => {
    const bookMd = await getBook(slug, dir)
    if (bookMd) {
      const cache = await getBookCache(dir, slug)
      if (cache.database?.id) {
        await _private._syncUpdateBook(ctx, bookMd, cache.database.id)
      } else {
        await _private._syncAddBook(ctx, bookMd)
      }
    }
  })

  await _private._syncRemoveBooks(ctx, bookSlugs)
}

async function _dump(ctx: Context): Promise<void> {
  const books = await ctx.prisma.book.findMany()
  const numCpus = cpus().length

  await eachLimit(books, numCpus, async (book) => {
    await _private._dumpBook(ctx, book)
  })
}

async function _process(ctx: Context): Promise<void> {
  const dir = ctx.command.options.dir
  const force = ctx.command.options.force
  const bookSlugs = await readBookDir(dir)
  const updatedBookSlugs = force
    ? bookSlugs
    : await getUpdatedSlugs(bookSlugs, dir, 'lastProcessed')

  await eachLimit(updatedBookSlugs, 1, async (slug) => {
    const bookMd = await getBook(slug, dir)
    if (bookMd) {
      await _private._processBook(ctx, bookMd)
    }
  })

  if (ctx.command.options.isDryRun === false) {
    await cleanUpDerivatives(dir)
  }
}

async function _dumpBook(ctx: Context, book: Book): Promise<void> {
  const dir = ctx.command.options.dir

  try {
    if (ctx.command.options.isDryRun === false) {
      const bookMd = await bookToMd(book)

      await updateBookMd(bookMd, dir)
      await cacheBook(book, dir)
    }
    log.info(`saved book to ${book.slug}.md`)
  } catch (e) {
    log.error(`error saving ${book.slug}`)
  }
}

async function _cleanup(ctx: Context): Promise<void> {
  await ctx.prisma.$disconnect()
}

async function run(): Promise<Context> {
  const command = await _private._parseArgs(hideBin(process.argv))

  const ctx: Context = {
    prisma,
    log,
    command,
  }

  ctx.log.level = command.options.quiet ? 'warn' : 'info'

  if (command.options.isDryRun) {
    ctx.log.child({ dryRun: true })
  }

  if (ctx.command.name === 'dump') {
    await _private._dump(ctx)
  } else if (ctx.command.name === 'sync') {
    await _private._sync(ctx)
  } else if (ctx.command.name === 'process') {
    await _private._process(ctx)
  }

  await _private._cleanup(ctx)

  return ctx
}

const _private = {
  _parseArgs,
  _process,
  _processBook,
  _syncAddBook,
  _syncUpdateBook,
  _syncUpdateBookExecute,
  _syncRemoveBooks,
  _syncRemoveBooksExecute,
  _dump,
  _sync,
  _dumpBook,
  _cleanup,
}

export { run, _private }
