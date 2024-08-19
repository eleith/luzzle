import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.env('LUZZLE_TOOLS')
		.options({
			prompt: {
				type: 'string',
				description:
					'a sentence explaining what the extraction is based on and any possible links to the source',
				demandOption: true,
			},
			file: {
				type: 'string',
				description: 'path to a pdf, doc or html file containing the article or website',
			},
			schema: {
				type: 'string',
				description: 'path to a json schema file',
				demandOption: true,
			},
			googleApiKey: {
				type: 'string',
				description: 'google api key',
				demandOption: true,
			},
			output: {
				type: 'string',
				description: 'output file',
				default: 'json',
				choices: ['json', 'yaml', 'csv'],
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
