import { getDatabaseClient, LuzzleDatabase, migrate } from '@luzzle/core'
import { getDirectoryFromConfig, getConfig } from './config.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import log from './log.js'
import path from 'path'
import commands, { Context } from './commands/index.js'
import { DATABASE_PATH } from './assets.js'
import VERSION from '../version.js'
import { Pieces } from './pieces/index.js'

async function parseArgs(_args: string[]) {
	const command = await yargs(_args)
		.strict()
		.command(commands.dump.command, commands.dump.describe)
		.command(commands.cd.command, commands.cd.describe)
		.command(commands.sync.command, commands.sync.describe, (yargs) =>
			commands.sync.builder?.(yargs)
		)
		.command(commands.validate.command, commands.validate.describe, (yargs) =>
			commands.validate.builder?.(yargs)
		)
		.command(commands.edit.command, commands.edit.describe, (yargs) =>
			commands.edit.builder?.(yargs)
		)
		.command(commands.field.command, commands.field.describe, (yargs) =>
			commands.field.builder?.(yargs)
		)
		.command(commands.editConfig.command, commands.editConfig.describe)
		.command(commands.create.command, commands.create.describe, (yargs) =>
			commands.create.builder?.(yargs)
		)
		.command(commands.init.command, commands.init.describe, (yargs) =>
			commands.init.builder?.(yargs)
		)
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
				description: 'custom directory to store config',
			},
		})
		.demandCommand(1, `[error] please specify a command`)
		.help()
		.version(VERSION)
		.showHelpOnFail(false)
		.parseAsync()

	return {
		name: command._[0],
		options: command,
	}
}

async function cleanup(ctx: Context): Promise<void> {
	await ctx.db.destroy()
}

async function initialize(command: Awaited<ReturnType<typeof parseArgs>>): Promise<void> {
	const config = getConfig(command.options.config)
	const db = {} as LuzzleDatabase
	const ctx: Context = {
		db,
		log,
		pieces: new Pieces(command.options.dir),
		directory: command.options.dir,
		config,
		flags: {
			dryRun: command.options.dryRun,
		},
	}
	await commands.init.run(ctx, command.options)
}

async function handle(command: Awaited<ReturnType<typeof parseArgs>>): Promise<void> {
	const config = getConfig(command.options.config)
	const directory = getDirectoryFromConfig(config)
	const db = getDatabaseClient(path.join(directory, DATABASE_PATH))
	const ctx: Context = {
		db,
		log,
		pieces: new Pieces(directory),
		directory,
		config,
		flags: {
			dryRun: command.options.dryRun,
		},
	}

	const migrationStatus = await migrate(ctx.db)

	if (!migrationStatus.error) {
		log.info(`using config at ${config.path}`)

		await Object.values(commands)
			.find((c) => c.name === command.name)
			?.run(ctx, command.options)
	} else {
		log.error(migrationStatus.error)
	}

	await cleanup(ctx)
}

async function run(): Promise<void> {
	try {
		const command = await parseArgs(hideBin(process.argv))

		log.level = command.options.verbose ? 'info' : 'warn'

		if (command.options.dryRun) {
			log.child({ dryRun: true }, { level: 'info' })
			log.level = 'info'
		}

		if (command.name === 'init') {
			await initialize(command)
		} else {
			await handle(command)
		}
	} catch (err) {
		if (err instanceof Error) {
			log.info(err?.message)
			log.error(err?.stack)
		} else {
			log.error(err)
		}
	}
}

export default run
