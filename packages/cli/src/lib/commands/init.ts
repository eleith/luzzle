import log from '../log'
import { Command } from './index.types'
import { Argv } from 'yargs'
import { inititializeConfig } from '../config'
import { stat } from 'fs/promises'

export type InitArgv = { dir: string }

const command: Command<InitArgv> = {
  name: 'init',

  command: 'init <dir>',

  describe: 'initialize luzzle inside <dir>',

  builder: <T>(yargs: Argv<T>) => {
    return yargs.positional('dir', {
      type: 'string',
      description: 'directory for the book entries',
      demandOption: 'a directory containing book entries must be provided',
    })
  },

  run: async function (ctx, args) {
    const dir = args.dir
    const dirStat = await stat(args.dir).catch(() => null)

    if (args.dir && !dirStat?.isDirectory()) {
      throw new Error(`[error] '${args.dir}' is not a folder`)
    }

    if (ctx.flags.dryRun === false) {
      const config = await inititializeConfig(dir)
      log.info(`initialized config at ${config.path}`)
    } else {
      log.info(`initialized config`)
    }
  },
}

export default command
