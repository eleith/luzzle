import { Argv } from 'yargs'
import generateTheme from './index.js'
import { getConfig } from '../../lib/config.js'

export default function command(cli: Argv) {
	return cli.command(
		'theme',
		'generate theme css and print to stdout',
		function (yargs) {
			const options = yargs.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
				},
			})
			return options
		},
		async function (argv) {
			const config = getConfig(argv.config as string | undefined)
			await generateTheme(config)
		}
	)
}
