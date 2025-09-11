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
			in: {
				type: 'string',
				description: 'path to luzzle directory',
				demandOption: true,
				alias: 'luzzle',
			},
			out: {
				type: 'string',
				description: 'path to luzzle images directory',
				demandOption: true,
				alias: 'images',
			},
			templates: {
				type: 'string',
				description: 'template folder of eta templates for open graph generation',
				demandOption: true,
			},
			force: {
				type: 'boolean',
				description: 'force regeneration of variants',
				default: false,
				alias: 'f',
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
