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
				}
			})
			return options
		},
		async function(argv) {
			const config = getConfig(argv.config as string | undefined)
			await generateSqlite(config)
		}
	)
}
