import log from '../../log.js'
import { Command } from '../utils/types.js'
import { Argv } from 'yargs'
import { stat } from 'fs/promises'
import { getDatabaseClient, migrate } from '@luzzle/core'
import path from 'path'
import { pathToFileURL } from 'url'
import { getDatabasePath } from '../../config.js'

export type InitArgv = { dir: string }

const command: Command<InitArgv> = {
	name: 'init',

	command: 'init <dir>',

	describe: 'initialize luzzle inside <dir>',

	builder: <T>(yargs: Argv<T>) => {
		return yargs.positional('dir', {
			type: 'string',
			description: 'directory for luzzle',
			demandOption: 'a directory containing luzzle is required',
		})
	},

	run: async function (ctx, args) {
		const dir = args.dir
		const dirStat = await stat(args.dir).catch(() => null)

		if (args.dir && !dirStat?.isDirectory()) {
			throw new Error(`${args.dir} is not a folder`)
		}

		if (ctx.flags.dryRun === false) {
			const dbPath = getDatabasePath(ctx.config)
			const dirUri = pathToFileURL(path.resolve(dir))
			const configPath = await stat(ctx.config.path).catch(() => null)

			if (configPath === null) {
				log.warn(`config file already exists at ${ctx.config.path}`)
			}

			ctx.config.set('directory', dirUri.href)
			ctx.db = getDatabaseClient(dbPath)

			await migrate(ctx.db)

			log.info(`initialized config at ${ctx.config.path} and db at ${dbPath}`)
		} else {
			log.info(`initialized config and db`)
		}
	},
}

export default command
