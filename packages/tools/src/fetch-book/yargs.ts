import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.env('LUZZLE_TOOLS')
		.options({
			prompt: {
				type: 'string',
				description: 'title, year or other words to describe the game',
				demandOption: true,
			},
			googleApiKey: {
				type: 'string',
				description: 'google api key',
			},
			output: {
				type: 'string',
				description: 'output file',
				default: 'luzzle',
				choices: ['json', 'yaml', 'luzzle'],
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
