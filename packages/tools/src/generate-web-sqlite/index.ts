#! /usr/bin/env node

import { generateWebSqlite } from './database.js'
import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'

async function run() {
	console.log('[start] generate sqlite...')

	try {
		const command = await parseArgs(hideBin(process.argv))
		await generateWebSqlite(command.db)
	} catch (error) {
		console.error('Error during generation:', error)
	}

	console.log('[done] generate sqlite')
}

run()
