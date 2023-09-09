import { pino } from 'pino'
import pretty from 'pino-pretty'

const log = pino(
	pretty.default({
		levelFirst: true,
		colorize: true,
		ignore: 'time,hostname,pid',
	})
)

export default log
