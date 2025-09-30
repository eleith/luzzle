#! /usr/bin/env node
/* v8 ignore start */

import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { generateVariants } from './variants.js'
import { generateOpenGraphs } from './opengraph.js'
import { generateWebSqlite } from './sqlite.js'
import { checkConfig } from './config-check.js'
import { generateTheme } from './theme.js'

async function run() {
	try {
		const args = await parseArgs(hideBin(process.argv))
		const outDir = args.out
		const inDir = args.luzzle
		const force = args.force
		const template = args.template
		const limit = args.limit
		const command = args._[0]
		const config = args.config

		if (command === 'validate') {
			checkConfig(config)
		} else if (command === 'sqlite') {
			generateWebSqlite(config)
		} else if (command === 'variants' && inDir && outDir) {
			generateVariants(config, inDir, outDir, { force, limit })
		} else if (command === 'opengraph' && template && inDir && outDir) {
			generateOpenGraphs(config, inDir, outDir, template, { force, limit })
		} else if (command === 'theme') {
			generateTheme(config, outDir, args.minify)
		}
	} catch (error) {
		console.error('Error during asset generation:', error)
	}
}

await run()
/* v8 ignore stop */
