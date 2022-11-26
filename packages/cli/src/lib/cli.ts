import { Book, PrismaClient } from './prisma'
import { getPrismaClient } from './prisma'
import { getDirectoryFromConfig, inititializeConfig, getConfig, Config } from './config'
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
  dbPath,
} from './book'
import log from './log'
import { difference } from 'lodash'
import { Logger } from 'pino'
import path from 'path'

export type Commands = 'sync' | 'dump' | 'process' | 'init'

export type Context = {
  prisma: PrismaClient
  log: Logger
  directory: string
  config: Config
  flags: {
    force: boolean
    dryRun: boolean
    quiet: boolean
  }
}

async function _parseArgs(_args: string[]) {
  const command = await yargs(_args)
    .strict()
    .command('sync', 'sync directory to local database')
    .command('dump', 'dump database to local markdown files')
    .command('process', 'process local markdown files for cleaning')
    .command('init <dir>', 'initialize luzzle config with directory', (yargs) => {
      return yargs
        .positional('dir', {
          type: 'string',
          description: 'directory for the book entries',
          demandOption: 'a directory containing book entries must be provided',
        })
        .check(async (args) => {
          const dirStat = await stat(args.dir).catch(() => null)

          if (args.dir && !dirStat?.isDirectory()) {
            throw new Error(`[error] '${args.dir}' is not a folder`)
          }

          return true
        })
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
      config: {
        alias: 'c',
        type: 'string',
        description: 'override default system config',
      },
    })
    .exitProcess(false)
    .demandCommand(1, `[error] please specify a command`)
    .parseAsync()

  return {
    name: command._[0] as Commands,
    options: command,
  }
}

async function _processBook(ctx: Context, bookMd: BookMd): Promise<void> {
  const dir = ctx.directory

  try {
    if (ctx.flags.dryRun === false) {
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
    if (ctx.flags.dryRun === false) {
      const bookCreateInput = await bookMdToBookCreateInput(bookMd, ctx.directory)
      const bookAdded = await ctx.prisma.book.create({ data: bookCreateInput })

      await cacheBook(bookAdded, ctx.directory)
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
  const dir = ctx.directory
  try {
    if (ctx.flags.dryRun === false) {
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
    if (ctx.flags.dryRun === false) {
      await ctx.prisma.book.deleteMany({ where: { slug: { in: slugs } } })
    }
    log.info(`deleted ${slugs.join(', ')}`)
  } catch (err) {
    log.error(err as string)
  }
}

async function _sync(ctx: Context): Promise<void> {
  const bookSlugs = await readBookDir(ctx.directory)
  const dir = ctx.directory
  const force = ctx.flags.force
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
  const dir = ctx.directory
  const force = ctx.flags.force
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

  if (ctx.flags.dryRun === false) {
    await cleanUpDerivatives(dir)
  }
}

async function _dumpBook(ctx: Context, book: Book): Promise<void> {
  const dir = ctx.directory

  try {
    if (ctx.flags.dryRun === false) {
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

async function run(): Promise<Context | null> {
  try {
    const command = await _private._parseArgs(hideBin(process.argv))
    const config = getConfig(command.options.config)
    const directory = getDirectoryFromConfig(config)

    const ctx: Context = {
      prisma: getPrismaClient({
        datasources: { db: { url: `file:${path.join(directory, dbPath)}` } },
      }),
      log,
      directory,
      config,
      flags: {
        dryRun: command.options.dryRun,
        quiet: command.options.quiet,
        force: command.options.force,
      },
    }

    ctx.log.level = ctx.flags.quiet ? 'warn' : 'info'

    if (command.options.dryRun) {
      ctx.log.child({ dryRun: true })
    }

    if (command.name === 'dump') {
      await _private._dump(ctx)
    } else if (command.name === 'sync') {
      await _private._sync(ctx)
    } else if (command.name === 'process') {
      await _private._process(ctx)
    } else if (command.name === 'init') {
      await inititializeConfig(directory)
      log.info(`initialized config at ${ctx.config.path}`)
    }

    await _private._cleanup(ctx)

    return ctx
  } catch (e) {
    log.error(e)
    return null
  }
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
