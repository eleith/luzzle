import { Book } from './prisma'
import { getPrismaClient } from './prisma'
import { getDirectoryFromConfig, inititializeConfig, getConfig } from './config'
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
  readBookDir,
  getUpdatedSlugs,
  writeBookMd,
  getBookCache,
  getSlugFromBookMd,
  bookToMd,
  dbPath,
  cacheBook,
} from './book'
import log from './log'
import { difference } from 'lodash'
import path from 'path'
import got from 'got'
import { spawn } from 'child_process'
import commands, { Context } from './commands'

async function _parseArgs(_args: string[]) {
  const command = await yargs(_args)
    .strict()
    .command('sync', 'sync directory to local database')
    .command('dump', 'dump database to local markdown files')
    .command('deploy', 'run deploy webhook to update remote database')
    .command('cd', 'change directory to the book directory')
    .command(commands.edit.name, commands.edit.describe, (yargs) => commands.edit.builder?.(yargs))
    .command(commands.attach.name, commands.attach.describe, (yargs) =>
      commands.attach.builder?.(yargs)
    )
    .command(commands.editConfig.name, commands.editConfig.describe)
    .command(commands.process.name, commands.process.describe, (yargs) =>
      commands.process.builder?.(yargs)
    )
    .command(commands.create.name, commands.create.describe, (yargs) =>
      commands.create.builder?.(yargs)
    )
    .command(commands.fetch.name, commands.fetch.describe, (yargs) =>
      commands.fetch.builder?.(yargs)
    )
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
      verbose: {
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
    name: command._[0],
    options: command,
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

async function _cd(ctx: Context): Promise<void> {
  if (process.env.LUZZLE) {
    log.error('already in luzzle instance')
    return
  }

  if (process.env.SHELL) {
    if (ctx.flags.dryRun === false) {
      spawn(process.env.SHELL, [], {
        cwd: ctx.directory,
        env: { ...process.env, LUZZLE: 'true' },
        stdio: 'inherit',
      }).on('exit', process.exit)
    } else {
      log.info(`cd to ${ctx.directory}`)
    }
  } else {
    log.error('could not find shell')
  }
}

async function _deploy(ctx: Context): Promise<void> {
  const { url, token, body } = ctx.config.get('deploy')
  const headers = { Authorization: `Bearer ${token}` }

  if (ctx.flags.dryRun === false) {
    if (body) {
      await got.post(url, { json: JSON.parse(body), headers })
    } else {
      await got.post(url, { headers: headers })
    }
  }

  ctx.log.info(`deployed to ${url}`)
}

async function _dump(ctx: Context): Promise<void> {
  const books = await ctx.prisma.book.findMany()
  const numCpus = cpus().length

  await eachLimit(books, numCpus, async (book) => {
    await _private._dumpBook(ctx, book)
  })
}

async function _dumpBook(ctx: Context, book: Book): Promise<void> {
  const dir = ctx.directory

  try {
    if (ctx.flags.dryRun === false) {
      const bookMd = await bookToMd(book)

      await writeBookMd(bookMd, dir)
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

async function run(): Promise<void> {
  try {
    const command = await _private._parseArgs(hideBin(process.argv))
    const config = getConfig(command.options.config)

    log.level = command.options.verbose ? 'info' : 'warn'

    if (command.options.dryRun) {
      log.child({ dryRun: true })
      log.level = 'info'
    }

    if (command.name === 'init') {
      if (command.options.dryRun === false) {
        await inititializeConfig(command.options.dir)
      }
      log.info(`initialized config at ${config.path}`)
    } else {
      log.info(`using config at ${config.path}`)
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
          verbose: command.options.verbose,
          force: command.options.force,
        },
      }

      // directory MUST exist
      switch (command.name) {
        case 'dump':
          await _private._dump(ctx)
          break
        case 'cd':
          await _private._cd(ctx)
          break
        case 'deploy':
          await _private._deploy(ctx)
          break
        case 'sync':
          await _private._sync(ctx)
          break
        case 'edit-config':
          await commands.editConfig.run(ctx, command.options)
          break
        case 'edit':
          await commands.edit.run(ctx, command.options)
          break
        case 'create':
          await commands.create.run(ctx, command.options)
          break
        case 'fetch':
          await commands.fetch.run(ctx, command.options)
          break
        case 'attach':
          await commands.attach.run(ctx, command.options)
          break
        case 'process':
          await commands.process.run(ctx, command.options)
          break
      }

      await _private._cleanup(ctx)

      return
    }
  } catch (e) {
    log.error(e)
    return
  }
}

const _private = {
  _parseArgs,
  _syncAddBook,
  _syncUpdateBook,
  _syncUpdateBookExecute,
  _syncRemoveBooks,
  _syncRemoveBooksExecute,
  _cd,
  _dump,
  _sync,
  _deploy,
  _dumpBook,
  _cleanup,
}

export { run, _private }
