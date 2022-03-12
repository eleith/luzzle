import logger from 'pino'
import pretty from 'pino-pretty'

const log = logger(
  pretty({
    levelFirst: true,
    colorize: true,
    ignore: 'time,hostname,pid',
  })
)

export default log
