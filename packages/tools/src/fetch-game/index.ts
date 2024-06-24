#! /usr/bin/env node

import { generateMetadataFromPrompt } from './google-ai.js'
import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import yaml from 'yaml'

async function run(): Promise<void> {
	try {
		const command = await parseArgs(hideBin(process.argv))
		const results: Record<string, string | number> = {}

		if (command.googleApiKey && command.prompt) {
			const aiResults = await generateMetadataFromPrompt(command.googleApiKey, command.prompt)

			Object.entries(aiResults).forEach(([key, value]) => {
				if (value !== null) {
					results[key] = value
				}
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
