import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.env('LUZZLE_TOOLS')
		.options({
			url: {
				type: 'string',
				description: 'url to find archive url for',
				demandOption: true,
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
