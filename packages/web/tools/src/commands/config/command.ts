import type { Argv } from 'yargs'
import { validateHandler, getHandler, setHandler } from './index.js'

export default function configCommand(cli: Argv) {
	return cli.command('config <subcommand>', 'Manage configuration', (yargs) => {
		yargs
			.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
					alias: 'c',
				},
			})
			.command(
				'validate',
				'Validate the configuration file',
				function (yargs) {
					return yargs
				},
				function (argv) {
					validateHandler(argv.config as string | undefined)
				}
			)
			.command(
				'get <path>',
				'Get a value from the configuration',
				function (yargs) {
					return yargs.positional('path', {
						type: 'string',
						description: 'Path to the value to get',
						demandOption: true,
					})
				},
				function (argv) {
					getHandler(argv.config as string | undefined, argv.path as string)
				}
			)
			.command(
				'set <path> <value>',
				'Set a value in the configuration',
				function (yargs) {
					return yargs
						.positional('path', {
							type: 'string',
							description: 'Path to the value to set',
							demandOption: true,
						})
						.positional('value', {
							type: 'string',
							description: 'The value to set',
							demandOption: true,
						})
				},
				function (argv) {
					setHandler(argv.config as string | undefined, argv.path as string, argv.value)
				}
			)
			.demandCommand(1, 'You need to specify a subcommand [validate, get, set]')
	})
}

