#! /usr/bin/env node

import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { generateMetadataFromPrompt } from './google-ai.js'
import yaml from 'yaml'

async function run(): Promise<void> {
	try {
		const command = await parseArgs(hideBin(process.argv))
		const results = await generateMetadataFromPrompt(
			command.googleApiKey,
			command.schema,
			command.prompt,
			command.file
		)

		for (const result of Object.keys(results)) {
			if (results[result] === null) {
				delete results[result]
			}
		}

		switch (command.output) {
			case 'yaml':
				console.log(yaml.stringify(results))
				break
			case 'json':
			default:
				console.log(JSON.stringify(results, null, 2))
				break
		}
	} catch (err) {
		console.error(err)
	}
}

run()
