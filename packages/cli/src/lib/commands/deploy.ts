import { Command } from './utils/types.js'
import got from 'got'

const command: Command = {
  name: 'deploy',

  command: 'deploy',

  describe: 'deploy database to a remote web server',

  run: async function (ctx) {
    const { url, token, body } = ctx.config.get('deploy')
    const headers = { Authorization: `Bearer ${token}` }

    if (ctx.flags.dryRun === false) {
      if (body) {
        await got.post(url, { json: JSON.parse(body), headers })
      } else {
        await got.post(url, { headers })
      }
    }

    ctx.log.info(`deployed to ${url}`)
  },
}

export default command
