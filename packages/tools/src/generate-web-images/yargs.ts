import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.options({
			db: {
				type: 'string',
				description: 'path to luzzle web sqlite',
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
				description: 'path to web images directory',
				demandOption: true,
				alias: 'images',
			},
			limit: {
				type: 'number',
				description: 'maximum number of images to process, used for testing',
				default: Infinity,
			},
			template: {
				type: 'string',
				description: 'eta template for open graph generation',
				demandOption: true,
			},
			force: {
				type: 'boolean',
				description: 'force processing of all images, irrespective of last modiified times',
				default: false,
				alias: 'f',
			},
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
