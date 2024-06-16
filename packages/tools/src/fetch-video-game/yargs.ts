import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.env('LUZZLE_TOOLS')
		.options({
			title: {
				type: 'string',
				description: 'game title',
				demandOption: true,
			},
			url: {
				type: 'string',
				description: 'game url',
			},
			googleApiKey: {
				type: 'string',
				description: 'google api key',
			},
			igdbClientId: {
				type: 'string',
				description: 'igdb client id',
			},
			igdbSecret: {
				type: 'string',
				description: 'igdb secret',
			},
			igdbId: {
				type: 'string',
				description: 'igdb game id',
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
