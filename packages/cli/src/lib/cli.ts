import { getDatabaseClient, LuzzleDatabase } from '@luzzle/kysely'
import { getDirectoryFromConfig, getConfig } from './config.js'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import log from './log.js'
import path from 'path'
import commands, { Context } from './commands/index.js'
import { DATABASE_PATH } from './assets.js'
import { migrate } from '@luzzle/kysely'

async function parseArgs(_args: string[]) {
  const command = await yargs(_args)
    .strict()
    .command(commands.dump.command, commands.dump.describe)
    .command(commands.deploy.command, commands.deploy.describe)
    .command(commands.cd.command, commands.cd.describe)
    .command(commands.sync.command, commands.sync.describe, (yargs) =>
      commands.sync.builder?.(yargs)
    )
    .command(commands.edit.command, commands.edit.describe, (yargs) =>
      commands.edit.builder?.(yargs)
    )
    .command(commands.attach.command, commands.attach.describe, (yargs) =>
      commands.attach.builder?.(yargs)
    )
    .command(commands.editConfig.command, commands.editConfig.describe)
    .command(commands.process.command, commands.process.describe, (yargs) =>
      commands.process.builder?.(yargs)
    )
    .command(commands.create.command, commands.create.describe, (yargs) =>
      commands.create.builder?.(yargs)
    )
    .command(commands.fetch.command, commands.fetch.describe, (yargs) =>
      commands.fetch.builder?.(yargs)
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
    .version('0.0.34')
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
  const ctx: Context = {
    db: {} as LuzzleDatabase,
    log,
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
  const ctx: Context = {
    db: getDatabaseClient(path.join(directory, DATABASE_PATH)),
    log,
    directory,
    config,
    flags: {
      dryRun: command.options.dryRun,
    },
  }

  await migrate(ctx.db)

  log.info(`using config at ${config.path}`)

  await Object.values(commands)
    .find((c) => c.name === command.name)
    ?.run(ctx, command.options)

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
      log.error(err?.message)
      log.info(err?.stack)
    } else {
      log.error(err)
    }
  }
}

export default run
