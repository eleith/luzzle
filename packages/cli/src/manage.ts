import run from './lib/cli'
import log from './lib/log'

run()
  .then(() => log.info('finito'))

  .catch((err) => {
    log.error(err as string)
  })
