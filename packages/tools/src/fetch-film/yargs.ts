import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.env('LUZZLE_TOOLS')
		.options({
			prompt: {
				type: 'string',
				description: 'title, year or other words to describe the game',
			},
			id: {
				type: 'string',
				description: 'the movie db id',
			},
			type: {
				type: 'string',
				description: 'the film type',
				default: 'movie',
				choices: ['movie', 'tv'],
			},
			googleApiKey: {
				type: 'string',
				description: 'google api key',
			},
			tmdbApiKey: {
				type: 'string',
				description: 'the movie db api key',
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
