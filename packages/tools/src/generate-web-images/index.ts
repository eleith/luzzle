#! /usr/bin/env node

import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { generateVariantsForPieces } from './variants.js'
import { getDatabaseClient } from '@luzzle/core'
import { type WebPieces } from './utils/types.js'
import { generateOpenGraphsForPieces } from './opengraph.js'

async function run() {
	try {
		const args = await parseArgs(hideBin(process.argv))
		const db = getDatabaseClient(args.sqlite)
		const outDir = args.out
		const inDir = args.luzzle
		const force = args.force
		const template = args.template
		const limit = args.limit
		const command = args._[0]

		const webPieces = await db
			.withTables<{ web_pieces: WebPieces }>()
			.selectFrom('web_pieces')
			.selectAll()
			.orderBy('date_consumed', 'desc')
			.orderBy('type', 'asc')
			.execute()

		if (command === 'variants') {
			console.log('[start] generating image variants...')
			await generateVariantsForPieces(webPieces, inDir, outDir, { force, limit })
			console.log('[done] generated image variants')
		} else if (command === 'opengraph' && template) {
			console.log('[start] generating open graphs...')
			await generateOpenGraphsForPieces(webPieces, inDir, outDir, template, { force, limit })
			console.log('[done] generated open graphs')
		} else {
			console.warn('no command was run')
		}
	} catch (error) {
		console.error('Error during web image generation:', error)
	}
}

run()
