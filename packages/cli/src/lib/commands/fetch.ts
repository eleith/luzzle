import log from '../log'
import { Command } from './utils/types'
import { Argv } from 'yargs'
import { getBook, writeBookMd, fetchBookMd, Books } from '../books'
import { parseSlugFromPath } from './utils/helpers'

export type FetchArgv = { slug: string; file: string }

const command: Command<FetchArgv> = {
  name: 'fetch',

  command: 'fetch <slug|file>',

  describe: 'fetch metadata online for <slug>',

  builder: <T>(yargs: Argv<T>) => {
    return yargs
      .positional('slug', {
        type: 'string',
        description: 'book slug',
        demandOption: 'slug (or file) is required',
      })
      .positional('file', {
        type: 'string',
        description: 'path to the book file',
        demandOption: 'file (or slug) is required',
      })
  },

  run: async function (ctx, args) {
    const dir = ctx.directory
    const slug = parseSlugFromPath(args.file) || args.slug
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
