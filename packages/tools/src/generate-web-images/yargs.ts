import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.command('variants', 'generate web image variants')
		.command('opengraph', 'generate open graph images')
		.options({
			sqlite: {
				type: 'string',
				description: 'path to luzzle web sqlite',
				demandOption: true,
				alias: 'db',
			},
			luzzle: {
				type: 'string',
				description: 'path to luzzle directory',
				demandOption: true,
				alias: 'in',
			},
			out: {
				type: 'string',
				description: 'path to web images directory',
				demandOption: true,
				alias: 'o',
			},
			limit: {
				type: 'number',
				description: 'maximum number of images to process, used for testing',
				default: Infinity,
			},
			template: {
				type: 'string',
				description: 'eta template for open graph generation',
			},
			force: {
				type: 'boolean',
				description: 'force processing of all images, irrespective of last modiified times',
				default: false,
				alias: 'f',
			},
		})
		.demandCommand(1, 'You need to specify variants or opengraph')
		.check((argv) => {
			if (argv._[0] === 'opengraph' && !argv.template) {
				throw new Error('The --template option is required for the opengraph command')
			}
			return true
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
