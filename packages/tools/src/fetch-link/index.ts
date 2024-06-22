#! /usr/bin/env node

import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { availability } from './wayback.js'
import { generateDescription, generateTags } from './google-ai.js'
import yaml from 'yaml'
import { getItemByUrl } from './pocket.js'

async function prompt(apiKey: string, type: 'article' | 'website', url: string) {
	const tags = await generateTags(apiKey, type, url)
	const description = await generateDescription(apiKey, type, url)

	return { keywords: tags.join(', '), description }
}

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
		const type = command.type as 'article' | 'website'
		const results: Record<string, string | number | boolean> = {}

		if (command.googleApiKey) {
			const openaiResults = await prompt(command.googleApiKey, type, command.url)

			Object.entries(openaiResults).forEach(([key, value]) => {
				results[key] = value
			})
		}

		if (command.pocketAccessToken && command.pocketConsumerKey && command.type === 'article') {
			const pocketClient = {
				key: command.pocketConsumerKey,
				token: command.pocketAccessToken,
			}
			const pocketResults = await getItemByUrl(pocketClient, command.url)

			Object.entries(pocketResults).forEach(([key, value]) => {
				results[key] = value
			})
		}

		const archiveUrl = await getWaybackAvailability(command.url)

		if (archiveUrl) {
			results.archive_url = archiveUrl
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
