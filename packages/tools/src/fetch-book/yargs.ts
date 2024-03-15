import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.env('LUZZLE_TOOLS')
		.options({
			title: {
				type: 'string',
				description: 'book title',
				demandOption: true,
			},
			author: {
				type: 'string',
				description: 'book author',
				demandOption: true,
			},
			'openlibrary-book-id': {
				type: 'string',
				description: 'open library book id',
			},
			isbn: {
				type: 'string',
				description: 'isbn number',
			},
			openaiApiKey: {
				type: 'string',
				description: 'openai api key',
			},
			googleApiKey: {
				type: 'string',
				description: 'google api key',
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
