#! /usr/bin/env node

import { generateTags, generateDescription } from './google-ai.js'
import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { getIgdbClient, getIgdb } from './igdb.js'
import yaml from 'yaml'

async function prompt(apiKey: string, title: string, url?: string) {
	const tags = await generateTags(apiKey, title, url || '')
	const description = await generateDescription(apiKey, title, url || '')

	return { keywords: tags.join(', '), description }
}

async function run(): Promise<void> {
	try {
		const command = await parseArgs(hideBin(process.argv))
		const results: Record<string, string | number> = {}

		if (command.igdbClientId && command.igdbSecret && command.igdbId) {
			const igdbClient = await getIgdbClient(command.igdbClientId, command.igdbSecret)
			const igdbResults = await getIgdb(igdbClient, command.igdbId)

			Object.entries(igdbResults).forEach(([key, value]) => {
				if (value) {
					results[key] = value
				}
			})
		}

		if (command.googleApiKey) {
			const aiResults = await prompt(command.googleApiKey, command.title, command.url)

			Object.entries(aiResults).forEach(([key, value]) => {
				results[key] = value
			})
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
