import { Argv } from 'yargs'
import yaml from 'yaml'
import { writeFileSync } from 'fs'
import generateTheme from './index.js'
import { loadConfig, setConfigValue } from '../../lib/config/config.js'

export default function command(cli: Argv) {
	return cli.command(
		'theme',
		'generate theme css',
		function (yargs) {
			const options = yargs.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
					demandOption: true,
				},
				out: {
					type: 'string',
					description: 'path to directory to store the css',
					alias: 'o',
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
			const themePath = await generateTheme(argv.config, argv.out, argv.minify)
			if (themePath) {
				const config = loadConfig(argv.config)
				setConfigValue(config, 'paths.css.theme', themePath)
				writeFileSync(argv.config, yaml.stringify(config))
				console.log(`Theme CSS path set in ${argv.config}: ${themePath}`)
			}
		}
	)
}
