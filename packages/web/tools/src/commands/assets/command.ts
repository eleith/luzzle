import { Argv } from 'yargs'
import generateAssets from './index.js'

export default function command(cli: Argv) {
	return cli.command(
		'assets',
		'copy piece assets and generate image variants',
		function(yargs) {
			const options = yargs.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
					demandOption: true,
				},
				in: {
					type: 'string',
					description: 'path to luzzle archive',
				},
				out: {
					type: 'string',
					description: 'path to asset output',
					alias: 'o',
					demandOption: true,
				},
				id: {
					type: 'string',
					description: 'id of just one item to process',
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
			await generateAssets({
				configPath: argv.config,
				archiveDir: argv.in,
				outDir: argv.out,
				id: argv.id,
				force: argv.force,
			})
		}
	)
}
