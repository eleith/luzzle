import { Argv } from 'yargs'
import generateTheme from './index.js'

export default function command(cli: Argv) {
	return cli.command(
		'theme',
		'generate theme css and print to stdout',
		function (yargs) {
			const options = yargs.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
					demandOption: true,
				},
				minify: {
					type: 'boolean',
					description: 'minify output css',
					default: false,
				},
			})
			return options
		},
		async function (argv) {
			await generateTheme(argv.config, argv.minify)
		}
	)
}
