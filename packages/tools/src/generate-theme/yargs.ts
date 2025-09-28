import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export function parseArgs() {
	return yargs(hideBin(process.argv))
		.strict()
		.options({
			config: {
				type: 'string',
				description: 'Path to a custom user config file',
			},
			output: {
				type: 'string',
				description: 'The output directory for the theme file',
			},
			minify: {
				type: 'boolean',
				description: 'Minify the output CSS',
				default: false,
			},
		})
		.help()
		.parseSync()
}
