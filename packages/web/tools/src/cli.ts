#! /usr/bin/env node
import yargs from 'yargs'
import assetCommand from './commands/assets/command.js'
import openGraphCommand from './commands/opengraph/command.js'
import configCommand from './commands/config/command.js'
import themeCommand from './commands/theme/command.js'
import syncCommand from './commands/sync/command.js'

import { hideBin } from 'yargs/helpers'

async function parseArgs(args: string[]) {
	  const commands = [assetCommand, openGraphCommand, configCommand, themeCommand, syncCommand]
	  const cli = yargs(args)

	  commands
	    .reduce((cli, command) => command(cli), cli)
	    .demandCommand(
	      1,
	      'You need to specify a command [assets, opengraph, config, theme, sync]'
	    )		.help()
		.showHelpOnFail(true)
		.parseAsync()
}

await parseArgs(hideBin(process.argv))
