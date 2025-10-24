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
				id: {
					type: 'string',
					description: 'id of just one item to process',
				},
				force: {
					type: 'boolean',
					description: 'force processing of all items, irrespective of last modified times',
					default: false,
					alias: 'f',
				},
			})
			return options
		},
		async function(argv) {
			await generateOpenGraphs(argv.config, argv.luzzle, argv.out, {
				id: argv.id,
				force: argv.force,
			})
		}
	)
}
