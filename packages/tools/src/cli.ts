#! /usr/bin/env node
/* v8 ignore start */
import yargs from 'yargs'
import variantCommand from './commands/variants/command.js'
import openGraphCommand from './commands/opengraph/command.js'
import sqliteCommand from './commands/sqlite/command.js'
import validateCommand from './commands/validate/command.js'
import themeCommand from './commands/theme/command.js'

import { hideBin } from 'yargs/helpers'

async function parseArgs(args: string[]) {
	const commands = [variantCommand, openGraphCommand, sqliteCommand, validateCommand, themeCommand]
	const cli = yargs(args)

	commands
		.reduce((cli, command) => command(cli), cli)
		.demandCommand(
			1,
			'You need to specify a command [variants, opengraph, sqlite, validate, theme]'
		)
		.help()
		.showHelpOnFail(true)
		.parseAsync()
}

await parseArgs(hideBin(process.argv))
/* v8 ignore stop */
