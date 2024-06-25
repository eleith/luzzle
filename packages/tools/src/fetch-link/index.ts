#! /usr/bin/env node

import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { availability } from './wayback.js'
import { generateMetadataFromPrompt } from './google-ai.js'
import yaml from 'yaml'

async function getWaybackAvailability(url: string) {
	const waybackAvailability = await availability(url)

	if (waybackAvailability) {
		const closest = waybackAvailability.archived_snapshots.closest
		if (closest && closest.available) {
			return closest.url
		}
	}

	return null
}

async function run(): Promise<void> {
	try {
		const command = await parseArgs(hideBin(process.argv))
		const results: Record<string, string | number | boolean> = {}

		if (command.googleApiKey) {
			const geminiResults = await generateMetadataFromPrompt(
				command.googleApiKey,
				command.prompt,
				command.file
			)

			Object.entries(geminiResults).forEach(([key, value]) => {
				results[key] = value
			})

			const archiveUrl = await getWaybackAvailability(geminiResults.url)

			if (archiveUrl) {
				results.archive_url = archiveUrl
			}
		}

		switch (command.output) {
			case 'yaml':
				console.log(yaml.stringify(results))
				break
			case 'json':
				console.log(JSON.stringify(results, null, 2))
				break
			default:
				console.log(
					Object.entries(results)
						.map(([key, value]) => `${key}=${value.toString().replace(/\n/g, '\\n')}`)
						.join('\n')
				)
				break
		}
	} catch (err) {
		console.error(err)
	}
}

run()
