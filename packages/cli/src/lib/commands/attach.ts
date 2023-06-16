import log from '../log.js'
import { Argv } from 'yargs'
import { getBook, writeBookMd, downloadCover, Books } from '../books/index.js'
import { Command } from './utils/types.js'
import { parseSlugFromPath } from './utils/helpers.js'

export type AttachArgv = { slug: string; path: string; file: string }

const command: Command<AttachArgv> = {
  name: 'attach',

  command: 'attach <slug|path> <file|url>',

  describe: 'attach a copy of path to <type> <slug>',

  builder: function <T>(yargs: Argv<T>) {
    return yargs
      .positional('slug', {
        type: 'string',
        description: 'book slug',
        demandOption: 'slug (or path) is required',
      })
      .positional('path', {
        type: 'string',
        description: 'path to the book',
        demandOption: 'path (or slug) is required',
      })
      .positional('file', {
        type: 'string',
        description: 'file to attach',
        demandOption: 'file (or url) is required',
      })
      .positional('url', {
        type: 'string',
        description: 'url to download and attach',
        demandOption: 'url (or file) is required',
      })
  },

  run: async function (ctx, args) {
    const dir = ctx.directory
    const slug = parseSlugFromPath(args.path) || args.slug
    const file = args.file
    const books = new Books(dir)
    const bookMd = await getBook(books, slug)

    if (!bookMd) {
      log.info(`${slug} was not found`)
      return
    }

    if (ctx.flags.dryRun === false) {
      const bookProcessed = await downloadCover(books, bookMd, file)
      await writeBookMd(books, bookProcessed)
    }

    log.info(`uploaded ${file} to ${bookMd.filename}`)
  },
}

export default command
