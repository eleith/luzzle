/* v8 ignore start */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export function parseArgs() {
	return yargs(hideBin(process.argv))
		.strict()
		.options({
			config: {
				type: 'string',
				description: 'Path to a custom user config file to check',
			},
		})
		.help()
		.parseSync()
}
/* v8 ignore stop */
