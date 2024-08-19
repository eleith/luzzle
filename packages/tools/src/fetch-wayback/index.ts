#! /usr/bin/env node

import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { getClosestAvailable } from './wayback.js'

async function run(): Promise<void> {
	try {
		const command = await parseArgs(hideBin(process.argv))
		const archiveUrl = await getClosestAvailable(command.url)

		if (archiveUrl) {
			console.log(archiveUrl)
		} else {
			console.error('No archive available')
		}
	} catch (err) {
		console.error(err)
	}
}

run()
