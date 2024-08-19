import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.env('LUZZLE_TOOLS')
		.options({
			id: {
				type: 'string',
				description: 'the movie db id',
				demandOption: true,
			},
			type: {
				type: 'string',
				description: 'the film type',
				default: 'movie',
				choices: ['movie', 'tv'],
			},
			tmdbApiKey: {
				type: 'string',
				description: 'the movie db api key',
				demandOption: true,
			},
			output: {
				type: 'string',
				description: 'output file',
				default: 'json',
				choices: ['json', 'yaml'],
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
