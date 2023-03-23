import { getBook, Books } from '../books'
import log from '../log'
import { spawn } from 'child_process'
import { Command } from './utils/types'
import { Argv } from 'yargs'
import { parseSlugFromPath } from './utils/helpers'

export type EditArgv = {
  slug: string
  path: string
}

const command: Command<EditArgv> = {
  name: 'edit',

  command: 'edit <slug|path>',

  describe: 'edit a book',

  builder: <T>(yargs: Argv<T>) => {
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
  },

  run: async function (ctx, args) {
    const dir = ctx.directory
    const slug = parseSlugFromPath(args.path) || args.slug
    const books = new Books(dir)
    const bookMd = await getBook(books, slug)

    if (!bookMd) {
      log.error(`${slug} was not found`)
      return
    }

    if (process.env.EDITOR) {
      if (ctx.flags.dryRun === false) {
        spawn(process.env.EDITOR, [bookMd.filename], {
          cwd: dir,
          env: { ...process.env, LUZZLE: 'true' },
          stdio: 'inherit',
        }).on('exit', process.exit)
      } else {
        log.info(`editing ${bookMd.filename}`)
      }
    } else {
      log.error('could not find an editor')
    }
  },
}

export default command
