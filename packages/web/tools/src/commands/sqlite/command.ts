import { Argv } from 'yargs'
import generateSqlite from './index.js'

export default function command(cli: Argv) {
	return cli.command(
		'sqlite',
		'generate sqlite database for web',
		function(yargs) {
			const options = yargs.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
					demandOption: true,
				}
			})
			return options
		},
		async function(argv) {
			await generateSqlite(argv.config)
		}
	)
}
