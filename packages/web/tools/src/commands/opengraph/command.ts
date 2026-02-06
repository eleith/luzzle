import { Argv } from 'yargs'
import generateOpenGraphs from './index.js'
import { getConfig } from '../../lib/config.js'

export default function command(cli: Argv) {
	return cli.command(
		'opengraph',
		'generate open graph images',
		function(yargs) {
			const options = yargs.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
				},
				out: {
					type: 'string',
					description: 'path to direct asset output',
					alias: 'o',
					demandOption: true,
				},
				host: {
					type: 'string',
					description: 'host to use for generating open graph images',
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
			const config = getConfig(argv.config as string | undefined)
			await generateOpenGraphs(
				{
					outputDir: argv.out as string,
					host: argv.host as string | undefined,
					id: argv.id as string | undefined,
					force: argv.force as boolean,
				},
				config
			)
		}
	)
}
