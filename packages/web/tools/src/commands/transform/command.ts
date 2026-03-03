import { Argv } from 'yargs'
import runTransform from './index.js'
import { getConfig } from '../../lib/config.js'

export default function command(cli: Argv) {
	return cli.command(
		'transform',
		'run a transform for one or all pieces',
		function (yargs) {
			return yargs.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
				},
				type: {
					type: 'string',
					description: 'transform type to run (attachment, image, palette, opengraph); omit to run all',
					alias: 't',
				},
				file: {
					type: 'string',
					description: 'piece file_path to process; omit to run for all pieces',
				},
				out: {
					type: 'string',
					description: 'path to write asset files',
					demandOption: true,
					alias: 'o',
				},
				in: {
					type: 'string',
					description: 'path to luzzle archive',
				},
				'dry-run': {
					type: 'boolean',
					description: 'skip all DB writes (files are still written to disk)',
				},
			})
		},
		async function (argv) {
			const config = getConfig(argv.config as string | undefined)
			await runTransform(
				{
					archiveDir: argv.in as string | undefined,
					outDir: argv.out as string,
					type: argv.type as string | undefined,
					file: argv.file as string | undefined,
					dryRun: argv['dry-run'] as boolean | undefined,
				},
				config
			)
		}
	)
}
