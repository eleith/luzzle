import { Argv } from 'yargs'
import sync from './index.js'

export default function command(cli: Argv) {
	return cli.command(
		'sync',
		'sync pieces to database',
		function (yargs) {
			return yargs.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
				},
				in: {
					type: 'string',
					description: 'path to luzzle directory (overrides config storage)',
				},
				'dry-run': {
					type: 'boolean',
					description: 'run without making changes',
					default: false,
				},
				force: {
					type: 'boolean',
					description: 'force updates even if content is unchanged',
					default: false,
					alias: 'f',
				},
				prune: {
					type: 'boolean',
					description: 'prune unused assets from storage',
					default: false,
					alias: 'p',
				},
			})
		},
		async function (argv) {
			await sync({
				configPath: argv.config,
				luzzleDir: argv.in,
				dryRun: argv['dry-run'],
				force: argv.force,
				prune: argv.prune,
			})
		}
	)
}
