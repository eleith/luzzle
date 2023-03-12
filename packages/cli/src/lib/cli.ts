import { Book } from './prisma'
import { getPrismaClient } from './prisma'
import { getDirectoryFromConfig, getConfig } from './config'
import { eachLimit } from 'async'
import { cpus } from 'os'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { writeBookMd, bookToMd, dbPath, cacheBook } from './book'
import log from './log'
import path from 'path'
import commands, { Context } from './commands'

async function _parseArgs(_args: string[]) {
  const command = await yargs(_args)
    .strict()
    .command('dump', 'dump database to local markdown files')
    .command(commands.deploy.name, commands.deploy.describe)
    .command(commands.cd.name, commands.cd.describe)
    .command(commands.sync.name, commands.sync.describe)
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
    .command(commands.init.name, commands.init.describe, (yargs) => commands.init.builder?.(yargs))
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
      log.child({ dryRun: true }, { level: 'info' })
      log.level = 'info'
    }

    if (command.name === 'init') {
      const ctx: Context = {
        prisma: getPrismaClient(),
        log,
        directory: command.options.dir,
        config,
        flags: {
          dryRun: command.options.dryRun,
          verbose: command.options.verbose,
          force: command.options.force,
        },
      }
      await commands.init.run(ctx, command.options)
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
          await commands.cd.run(ctx, command.options)
          break
        case 'deploy':
          await commands.deploy.run(ctx, command.options)
          break
        case 'sync':
          await commands.sync.run(ctx, command.options)
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
  _dump,
  _dumpBook,
  _cleanup,
}

export { run, _private }
