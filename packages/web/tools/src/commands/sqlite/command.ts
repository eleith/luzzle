import { Argv } from 'yargs'
import generateSqlite from './index.js'
import { getConfig } from '../../lib/config.js'

export default function command(cli: Argv) {
	return cli.command(
		'sqlite',
		'generate sqlite database for web',
		function(yargs) {
			const options = yargs.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
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
			})
			return options
		},
		async function(argv) {
			const config = getConfig(argv.config as string | undefined)
			await generateSqlite(
				{
					archiveDir: argv.in as string | undefined,
					outDir: argv.out as string,
				},
				config
			)
		}
	)
}
