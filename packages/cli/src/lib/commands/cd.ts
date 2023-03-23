import { spawn } from 'child_process'
import { Command } from './utils/types'

const command: Command = {
  name: 'cd',

  command: 'cd',

  describe: 'change direction to the book directory',

  run: async function (ctx) {
    if (process.env.LUZZLE) {
      ctx.log.error('already in luzzle instance')
      return
    }

    if (process.env.SHELL) {
      if (ctx.flags.dryRun === false) {
        spawn(process.env.SHELL, [], {
          cwd: ctx.directory,
          env: { ...process.env, LUZZLE: 'true' },
          stdio: 'inherit',
        }).on('exit', process.exit)
      } else {
        ctx.log.info(`cd to ${ctx.directory}`)
      }
    } else {
      ctx.log.error('could not find shell')
    }
  },
}

export default command
