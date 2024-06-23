import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.env('LUZZLE_TOOLS')
		.options({
			url: {
				type: 'string',
				description: 'link url',
				demandOption: true,
			},
			html: {
				type: 'string',
				description: 'path to an html file',
			},
			googleApiKey: {
				type: 'string',
				description: 'google api key',
			},
			type: {
				description: 'type of content',
				choices: ['article', 'website'],
				default: 'article',
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
