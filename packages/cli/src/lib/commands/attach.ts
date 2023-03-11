import log from '../log'
import { Command } from './_types'
import { Argv } from 'yargs'
import { getBook, writeBookMd, downloadCover } from '../book'

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
    const bookMd = await getBook(slug, dir)

    if (!bookMd) {
      log.info(`${slug} was not found`)
      return
    }

    if (ctx.flags.dryRun === false) {
      const bookProcessed = await downloadCover(bookMd, file, dir)
      await writeBookMd(bookProcessed, dir)
    }

    log.info(`uploaded ${file} to ${bookMd.filename}`)
  },
}

export default command
