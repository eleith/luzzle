import { getDatabaseClient, LuzzleDatabase, migrate } from '@luzzle/core'
import { getConfig, getDatabasePath, getStorage } from './config.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import log from './log.js'
import getCommands, { Command, Context } from './commands/index.js'
import VERSION from '../version.js'
import { Pieces } from '@luzzle/core'

async function parseArgs<T>(
	_args: string[],
	commands: { [key: string]: Command<T> }
) {
	const cli = yargs(_args)
		.strict()
		.options({
			'dry-run': {
				type: 'boolean',
				description: 'run without making permanent changes',
				default: false,
			},
			verbose: {
				type: 'boolean',
				default: false,
			},
			config: {
				alias: 'c',
				type: 'string',
				description: 'Path to config file',
			},
		})
		.demandCommand(1, `[error] please specify a command`)
		.help()
		.version(VERSION)
		.showHelpOnFail(false)

	const cliCommands = Object.values(commands).reduce(
		(cli, command) =>
			cli.command(command.command, command.describe, (yargs) => command.builder?.(yargs)),
		cli
	)

	const fullCommand = await cliCommands.parseAsync()

	return {
		name: fullCommand._[0],
		options: fullCommand,
	}
}

async function cleanup(ctx: Context): Promise<void> {
	await ctx.db.destroy()
}

async function initialize<T>(
	command: Command<T>,
	parsedArgs: Awaited<ReturnType<typeof parseArgs>>
): Promise<void> {
	const config = getConfig(parsedArgs.options.config)
	const storage = getStorage(config)
	const db = {} as LuzzleDatabase
	const ctx: Context = {
		db,
		log,
		storage: getStorage(config),
		pieces: new Pieces(storage),
		config,
		flags: {
			dryRun: parsedArgs.options.dryRun,
		},
	}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await command.run(ctx, parsedArgs.options as any)
}

async function handle<T>(
	commands: { [key: string]: Command<T> },
	parsedArgs: Awaited<ReturnType<typeof parseArgs>>
): Promise<void> {
	const config = getConfig(parsedArgs.options.config)
	const storage = getStorage(config)
	const dbPath = getDatabasePath(config)
	const db = getDatabaseClient(dbPath)
	const ctx: Context = {
		db,
		log,
		storage: storage,
		pieces: new Pieces(storage),
		config,
		flags: {
			dryRun: parsedArgs.options.dryRun,
		},
	}

	const migrationStatus = await migrate(ctx.db)

	if (!migrationStatus.error) {
		await Object.values(commands)
			.find((c) => c.name === parsedArgs.name)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			?.run(ctx, parsedArgs.options as any)
	} else {
		log.error(migrationStatus.error)
	}

	await cleanup(ctx)
}

async function run(): Promise<void> {
	const commands = await getCommands()

	try {
		const parsedArgs = await parseArgs(hideBin(process.argv), commands)

		log.level = parsedArgs.options.verbose ? 'info' : 'warn'

		if (parsedArgs.options.dryRun) {
			log.child({ dryRun: true }, { level: 'info' })
			log.level = 'info'
		}

		if (parsedArgs.name === 'init') {
			await initialize(commands.init, parsedArgs)
		} else {
			await handle(commands, parsedArgs)
		}
	} catch (err) {
		if (err instanceof Error) {
			log.error(err?.stack)
		} else {
			log.error(err)
		}
	}
}

export default run
