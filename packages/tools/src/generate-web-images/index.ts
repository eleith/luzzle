#! /usr/bin/env node

import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { generateVariantsForPieces } from './variants.js'
import { getDatabaseClient } from '@luzzle/core'
import { type WebPieces } from './utils/types.js'

async function run() {
	console.log('[start] generating image variants...')

	try {
		const command = await parseArgs(hideBin(process.argv))
		const db = getDatabaseClient(command.db)
		const outDir = command.out
		const inDir = command.in
		const piece = command.piece
		const force = command.force

		const webPieces = await db
			.withTables<{ web_pieces: WebPieces }>()
			.selectFrom('web_pieces')
			.selectAll()
			.orderBy('date_consumed', 'desc')
			.orderBy('type', 'asc')
			.execute()

		const pieces = piece ? webPieces.filter(p => p.slug === piece) : webPieces

		await generateVariantsForPieces(pieces, inDir, outDir, force)
	} catch (error) {
		console.error('Error during variant generation:', error)
	}

	console.log('[done] generated image variants')
}

run()
