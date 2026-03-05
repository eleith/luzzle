import { Argv } from 'yargs'
import backfill from './index.js'
import { getConfig } from '../../lib/config.js'

export default function command(cli: Argv) {
	return cli.command(
		'backfill',
		'backfill asset keys and sanitize metadata for existing data',
		function (yargs) {
			return yargs.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
				},
				in: {
					type: 'string',
					description: 'path to luzzle archive',
				},
			})
		},
		async function (argv) {
			const config = getConfig(argv.config as string | undefined)
			await backfill(config)
		}
	)
}
