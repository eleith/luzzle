import { Argv } from 'yargs'
import sync from './index.js'
import { getConfig } from '../../lib/config.js'

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
					description: 'path to luzzle archive',
				},
				out: {
					type: 'string',
					description: 'path to write asset files',
					demandOption: true,
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
			const config = getConfig(argv.config as string | undefined)
			await sync(
				{
					archiveDir: argv.in as string | undefined,
					outDir: argv.out as string,
					dryRun: argv['dry-run'] as boolean,
					force: argv.force as boolean,
					prune: argv.prune as boolean,
				},
				config
			)
		}
	)
}
