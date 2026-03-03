import { Argv } from 'yargs'
import runTransform from './index.js'
import { getConfig } from '../../lib/config.js'

export default function command(cli: Argv) {
	return cli.command(
		'transform',
		'run a specific transform for a single piece (for development/debugging)',
		function (yargs) {
			return yargs.options({
				config: {
					type: 'string',
					description: 'path to config.yaml',
				},
				type: {
					type: 'string',
					description: 'transform type to run (attachment, image, opengraph)',
					demandOption: true,
					alias: 't',
				},
				file: {
					type: 'string',
					description: 'piece file_path to process',
					demandOption: true,
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
			})
		},
		async function (argv) {
			const config = getConfig(argv.config as string | undefined)
			await runTransform(
				{
					archiveDir: argv.in as string | undefined,
					outDir: argv.out as string,
					type: argv.type as string,
					file: argv.file as string,
				},
				config
			)
		}
	)
}
