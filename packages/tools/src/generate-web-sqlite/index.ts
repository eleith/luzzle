#! /usr/bin/env node
/* v8 ignore start */

import { generateWebSqlite } from './database.js'
import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { loadConfig } from '../lib/config-loader.js'

async function run() {
	console.log('[start] generate sqlite...')
	const command = await parseArgs(hideBin(process.argv))
	const config = loadConfig({ userConfigPath: command.config })

	try {
		await generateWebSqlite(config)
	} catch (error) {
		console.error('Error during generation:', error)
	}

	console.log('[done] generate sqlite')
}

run()
/* v8 ignore stop */
