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
			googleApiKey: {
				type: 'string',
				description: 'google api key',
			},
			pocketConsumerKey: {
				type: 'string',
				description: 'pocket consumer key',
			},
			pocketAccessToken: {
				type: 'string',
				description: 'pokcet access token',
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
