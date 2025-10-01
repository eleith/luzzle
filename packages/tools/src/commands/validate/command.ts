import { Argv } from 'yargs'
import checkConfig from './index.js'

export default function command(cli: Argv) {
	return cli.command(
		'validate',
		'validate config file',
		function(yargs) {
			const options = yargs.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
					demandOption: true,
				},
			})
			return options
		},
		function(argv) {
			checkConfig(argv.config)
		}
	)
}
