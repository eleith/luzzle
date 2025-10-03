/* v8 ignore start */
import type { Argv } from 'yargs'
import { validateHandler, getHandler, setHandler } from './index.js'

export default function configCommand(cli: Argv) {
	return cli.command('config <subcommand>', 'Manage configuration', (yargs) => {
		yargs
			.command(
				'validate',
				'Validate the configuration file',
				function(yargs) {
					return yargs.option('config', {
						alias: 'c',
						type: 'string',
						description: 'Path to the configuration file',
						demandOption: true,
					})
				},
				function(argv) {
					validateHandler(argv.config)
				}
			)
			.command(
				'get <path>',
				'Get a value from the configuration',
				function(yargs) {
					return yargs.positional('path', {
						type: 'string',
						description: 'Path to the value to get',
						demandOption: true,
					})
				},
				function(argv) {
					getHandler(argv.config, argv.path)
				}
			)
			.command(
				'set <path> <value>',
				'Set a value in the configuration',
				function(yargs) {
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
				function(argv) {
					setHandler(argv.config, argv.path, argv.value)
				}
			)
			.demandCommand(1, 'You need to specify a subcommand [validate, get, set]')
	})
}
/* v8 ignore stop */

