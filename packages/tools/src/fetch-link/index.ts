#! /usr/bin/env node

import { generateTags, generateSummary, generateClassification } from './openai.js'
import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { availability } from './wayback.js'

async function completeOpenAI(apiKey: string, url: string) {
	const tags = await generateTags(apiKey, url)
	const summary = await generateSummary(apiKey, url)
	const classification = await generateClassification(apiKey, url)

	return {
		tags: tags.join(', '),
		summary,
		is_paywall: classification.is_paywall,
		type: classification.is_article ? 'article' : 'bookmark',
	}
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
		const results: Record<string, string | number | boolean> = {}

		if (command.openaiApiKey) {
			const openaiResults = await completeOpenAI(command.openaiApiKey, command.url)

			Object.entries(openaiResults).forEach(([key, value]) => {
				results[key] = value
			})
		}

		const archiveUrl = await getWaybackAvailability(command.url)

		if (archiveUrl) {
			results.archive_url = archiveUrl
		}

		Object.entries(results).forEach(([key, value]) => {
			console.log(key)
			console.log(value)
		})
	} catch (err) {
		console.error(err)
	}
}

run()
