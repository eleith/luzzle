import log from '../log'
import { Command, Context } from './index.types'
import { Argv } from 'yargs'
import {
  BookMd,
  getBook,
  processBookMd,
  readBookDir,
  getUpdatedSlugs,
  cleanUpDerivatives,
  writeBookMd,
} from '../book'
import { eachLimit } from 'async'

export type ProcessArgv = { force: boolean }

async function processBook(ctx: Context, bookMd: BookMd): Promise<void> {
  const dir = ctx.directory

  if (ctx.flags.dryRun === false) {
    const bookProcessed = await processBookMd(bookMd)
    await writeBookMd(bookProcessed, dir)
  }

  log.info(`processed ${bookMd.filename}`)
}

const command: Command<ProcessArgv> = {
  name: 'process',

  command: 'process local markdown files for cleaning',

  describe: 'attach a copy of path to <type> <slug>',

  builder: <T>(yargs: Argv<T>) => {
    return yargs.options('force', {
      type: 'boolean',
      alias: 'f',
      description: 'force updates on all items',
      default: false,
    })
  },

  run: async function (ctx, args) {
    const dir = ctx.directory
    const bookSlugs = await readBookDir(dir)
    const updatedBookSlugs = args.force
      ? bookSlugs
      : await getUpdatedSlugs(bookSlugs, dir, 'lastProcessed')

    await eachLimit(updatedBookSlugs, 1, async (slug) => {
      const bookMd = await getBook(slug, dir)
      if (bookMd) {
        await processBook(ctx, bookMd)
      }
    })

    if (ctx.flags.dryRun === false) {
      await cleanUpDerivatives(dir)
    }
  },
}

export default command
