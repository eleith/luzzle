#! /usr/bin/env node

import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { generateVariantsForPieces } from './variants.js'
import { getDatabaseClient } from '@luzzle/core'
import { type WebPieces } from './utils/types.js'
import { generateOpenGraphsForPieces } from './opengraph.js'

async function run() {
	console.log('[start] generating image variants...')

	try {
		const command = await parseArgs(hideBin(process.argv))
		const db = getDatabaseClient(command.db)
		const outDir = command.out
		const inDir = command.in
		const force = command.force
		const templates = command.templates
		const limit = command.limit

		const webPieces = await db
			.withTables<{ web_pieces: WebPieces }>()
			.selectFrom('web_pieces')
			.selectAll()
			.orderBy('date_consumed', 'desc')
			.orderBy('type', 'asc')
			.execute()

		await generateVariantsForPieces(webPieces, inDir, outDir, { force, limit })
		await generateOpenGraphsForPieces(webPieces, inDir, outDir, templates, { force, limit })
	} catch (error) {
		console.error('Error during web image generation:', error)
	}

	console.log('[done] generated image variants')
}

run()
