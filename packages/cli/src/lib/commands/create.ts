import log from '../log'
import { Command } from './index.types'
import { Argv } from 'yargs'
import { createBookMd, writeBookMd } from '../book'

export type CreateArgv = { slug: string }

const command: Command<CreateArgv> = {
  name: 'create',

  command: 'create <slug>',

  describe: 'create a new <slug>',

  builder: <T>(yargs: Argv<T>) => {
    return yargs.positional('slug', {
      type: 'string',
      description: 'unique slug for <type>',
      demandOption: 'slug is required and must be unique per <type>',
    })
  },

  run: async function(ctx, args) {
    const dir = ctx.directory
    const title = args.slug

    if (ctx.flags.dryRun === false) {
      const bookMd = await createBookMd(title, 'markdown notes', { title, author: 'author' })
      await writeBookMd(bookMd, dir)
      log.info(`created new book at ${bookMd.filename}`)
    } else {
      log.info(`created new book at ${title.toLowerCase().replace(/\s+/g, '-')}.md`)
    }
  },
}

export default command
