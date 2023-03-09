import { getBook } from '../book'
import log from '../log'
import { spawn } from 'child_process'
import { Command } from './_types'
import { Argv } from 'yargs'

type EditArgv = { slug: string }

const command: Command<EditArgv> = {
  name: 'edit',

  command: 'edit <slug>',

  describe: 'edit the config file',

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
    const bookMd = await getBook(slug, dir)

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
