import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.options({
			db: {
				type: 'string',
				description: 'path to luzzle sqlite',
				demandOption: true,
				alias: 'sqlite',
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
