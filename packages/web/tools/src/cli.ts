#! /usr/bin/env node
import yargs from 'yargs'
import configCommand from './commands/config/command.js'
import themeCommand from './commands/theme/command.js'
import transformCommand from './commands/transform/command.js'

import { hideBin } from 'yargs/helpers'

async function parseArgs(args: string[]) {
	  const commands = [configCommand, themeCommand, transformCommand]
	  const cli = yargs(args)

	  commands
	    .reduce((cli, command) => command(cli), cli)
	    .demandCommand(
	      1,
	      'You need to specify a command [config, theme, transform]'
	    )		.help()
		.showHelpOnFail(true)
		.parseAsync()
}

await parseArgs(hideBin(process.argv))
