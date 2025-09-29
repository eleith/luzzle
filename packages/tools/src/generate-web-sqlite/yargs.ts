/* v8 ignore start */
import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.options({
			config: {
				type: 'string',
				description: 'Path to a custom user config file to check',
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
/* v8 ignore stop */
