import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.env('LUZZLE_TOOLS')
		.options({
			database: {
				type: 'string',
				description: 'luzzle sqlite file path',
				demandOption: true,
			},
			clean: {
				type: 'boolean',
				description: 'drop tables',
				default: false,
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
