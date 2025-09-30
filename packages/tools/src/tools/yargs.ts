/* v8 ignore start */
import yargs from 'yargs'

async function parseArgs(args: string[]) {
	return yargs(args)
		.strict()
		.command('variants', 'generate web image variants')
		.command('opengraph', 'generate open graph images')
		.command('sqlite', 'generate web db tables')
		.command('theme', 'generate web db tables')
		.command('validate', 'validate user config')
		.options({
			config: {
				type: 'string',
				description: 'path to config.yaml',
				demandOption: true,
			},
			luzzle: {
				type: 'string',
				description: 'path to luzzle directory',
				alias: 'in',
			},
			out: {
				type: 'string',
				description: 'path to direct asset output',
				alias: 'o',
			},
			limit: {
				type: 'number',
				description: 'maximum number of items to process, used for testing',
				default: Infinity,
			},
			minify: {
				type: 'boolean',
				description: 'compress any output',
				default: false,
			},
			template: {
				type: 'string',
				description: 'eta template for open graph generation',
			},
			force: {
				type: 'boolean',
				description: 'force processing of all items, irrespective of last modiified times',
				default: false,
				alias: 'f',
			},
		})
		.demandCommand(1, 'You need to specify a command [variants, opengraph, sqlite, validate, theme]')
		.check((argv) => {
			const command = argv._[0]

			if (command === 'opengraph' && (!argv.template || !argv.luzzle || !argv.out)) {
				throw new Error(
					'The --luzzle, --out and --template options are all required for the opengraph command'
				)
			}

			if (command === 'variants' && (!argv.luzzle || !argv.out)) {
				throw new Error('The --luzzle and --out options are both required for the variants command')
			}

			return true
		})
		.help()
		.showHelpOnFail(false)
		.parseSync()
}

export default parseArgs
/* v8 ignore stop */
