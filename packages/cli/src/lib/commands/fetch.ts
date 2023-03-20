import log from '../log'
import { Command } from './index.types'
import { Argv } from 'yargs'
import { getBook, writeBookMd, fetchBookMd, Books } from '../books'

export type FetchArgv = { slug: string }

const command: Command<FetchArgv> = {
  name: 'fetch',

  command: 'fetch <slug>',

  describe: 'fetch metadata online for <slug>',

  builder: <T>(yargs: Argv<T>) => {
    return yargs.positional('slug', {
      type: 'string',
      description: 'unique slug for <type>',
      demandOption: 'slug is required and must be unique per <type>',
    })
  },

  run: async function (ctx, args) {
    const dir = ctx.directory
    const slug = args.slug
    const books = new Books(dir)
    const bookMd = await getBook(books, slug)

    if (!bookMd) {
      log.info(`${slug} was not found`)
      return
    }

    if (ctx.flags.dryRun === false) {
      const bookProcessed = await fetchBookMd(books, bookMd)
      await writeBookMd(books, bookProcessed)
    }
    log.info(`processed ${bookMd.filename}`)
  },
}

export default command
