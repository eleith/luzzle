import log from '../log.js'
import { Command } from './utils/types.js'
import { Argv } from 'yargs'
import { stat } from 'fs/promises'
import { getDatabaseClient, migrate } from '@luzzle/kysely'
import path from 'path'
import { DATABASE_PATH } from '../assets.js'
import { existsSync } from 'fs'
import { pathToFileURL } from 'url'

export type InitArgv = { dir: string }

const command: Command<InitArgv> = {
	name: 'init',

	command: 'init <dir>',

	describe: 'initialize luzzle inside <dir>',

	builder: <T>(yargs: Argv<T>) => {
		return yargs.positional('dir', {
			type: 'string',
			description: 'directory for the book entries',
			demandOption: 'a directory containing book entries must be provided',
		})
	},

	run: async function (ctx, args) {
		const dir = args.dir
		const dirStat = await stat(args.dir).catch(() => null)

		if (args.dir && !dirStat?.isDirectory()) {
			throw new Error(`${args.dir} exists and is not a folder`)
		}

		if (ctx.flags.dryRun === false) {
			const dbPath = path.join(dir, DATABASE_PATH)
			const dirUri = pathToFileURL(path.resolve(dir))

			if (existsSync(ctx.config.path)) {
				ctx.log.warn(`config file already exists at ${ctx.config.path}`)
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
