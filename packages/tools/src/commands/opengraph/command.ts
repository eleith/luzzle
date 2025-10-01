import { Argv } from 'yargs'
import generateOpenGraphs from './index.js'

export default function command(cli: Argv) {
	return cli.command(
		'opengraph',
		'generate open graph images',
		function(yargs) {
			const options = yargs.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
					demandOption: true,
				},
				luzzle: {
					type: 'string',
					description: 'path to luzzle directory',
					alias: 'in',
					demandOption: true,
				},
				out: {
					type: 'string',
					description: 'path to direct asset output',
					alias: 'o',
					demandOption: true,
				},
				limit: {
					type: 'number',
					description: 'maximum number of items to process, used for testing',
					default: Infinity,
				},
				template: {
					type: 'string',
					description: 'eta template for open graph generation',
					demandOption: true,
				},
				force: {
					type: 'boolean',
					description: 'force processing of all items, irrespective of last modiified times',
					default: false,
					alias: 'f',
				},
			})
			return options
		},
		async function(argv) {
			await generateOpenGraphs(argv.config, argv.luzzle, argv.out, argv.template, {
				limit: argv.limit,
				force: argv.force,
			})
		}
	)
}
