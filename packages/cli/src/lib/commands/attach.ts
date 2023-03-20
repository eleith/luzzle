import log from '../log'
import { Argv } from 'yargs'
import { getBook, writeBookMd, downloadCover, Books } from '../books'
import { Command } from './index.types'

export type AttachArgv = { slug: string; file: string }

const command: Command<AttachArgv> = {
  name: 'attach',

  command: 'attach <slug> <file>',

  describe: 'attach a copy of path to <type> <slug>',

  builder: function <T>(yargs: Argv<T>) {
    return yargs
      .positional('slug', {
        type: 'string',
        description: 'slug for <type>',
        demandOption: 'slug is required',
      })
      .positional('file', {
        type: 'string',
        description: 'file or url to attach',
        demandOption: 'file or url is required',
      })
  },

  run: async function (ctx, args) {
    const dir = ctx.directory
    const { slug, file } = args
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
