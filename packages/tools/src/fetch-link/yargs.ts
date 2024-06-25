import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.env('LUZZLE_TOOLS')
		.options({
			prompt: {
				type: 'string',
				description: 'url and title to describe the article or website',
				demandOption: true,
			},
			file: {
				type: 'string',
				description: 'path to a pdf or html file containing the article or website',
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
