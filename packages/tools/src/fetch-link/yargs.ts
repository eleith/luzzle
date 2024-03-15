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
			openaiApiKey: {
				type: 'string',
				description: 'openai api key',
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
