import log from '../log'
import { spawn } from 'child_process'
import { Command, Context } from './_types'

const command: Command = {
  name: 'edit-config',

  command: 'edit-config',

  describe: 'edit the config file',

  run: async function(ctx: Context) {
    const dir = ctx.directory

    if (process.env.EDITOR) {
      if (ctx.flags.dryRun === false) {
        spawn(process.env.EDITOR, [ctx.config.path], {
          cwd: dir,
          env: { ...process.env, LUZZLE: 'true' },
          stdio: 'inherit',
        }).on('exit', process.exit)
      } else {
        log.info(`editing config at ${ctx.config.path}`)
      }
    } else {
      log.error('could not find an editor')
    }
  },
}

export default command
