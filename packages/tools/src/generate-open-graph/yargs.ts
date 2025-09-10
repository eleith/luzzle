import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.options({
			luzzle: {
				type: 'string',
				description: 'path to the luzzle root',
				demandOption: true,
			},
			file: {
				type: 'string',
				description: 'file of one piece to test open graph generation for',
				demandOption: true,
			},
			format: {
				type: 'string',
				description: 'output format when testing open graph generation',
				default: 'html',
				choices: ['png', 'svg', 'html'],
			},
			templates: {
				type: 'string',
				description: 'path to templates folder',
				alias: 't',
				demandOption: true,
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
