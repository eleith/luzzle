#! /usr/bin/env node

import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { exec } from 'child_process'
import { temporaryWrite } from 'tempy'
import { Pieces, StorageFileSystem } from '@luzzle/cli'
import { generateVariantForPiece } from './variants.js'

async function openBuffer(
	buffer: Buffer,
	extension: string
) {
	const tmp = await temporaryWrite(buffer, { extension })
	const cmd = `xdg-open "${tmp}"`

	exec(cmd, (error) => {
		if (error) {
			console.error(`Failed to open file: ${error.message}`)
			return
		}
	})
}

async function run() {
	const command = await parseArgs(hideBin(process.argv))
	const luzzle = command.luzzle
	const file = command.file
	const format = command.format as 'jpg' | 'avif'
	const size = command.size as 'small' | 'medium' | 'large' | 'xl'
	const field = command.field

	const storage = new StorageFileSystem(luzzle)
	const pieces = new Pieces(storage)
	const markdown = await pieces.getPieceMarkdown(file)

	try {
		const buffer = await generateVariantForPiece(markdown, pieces, field, format, size)
		await openBuffer(buffer, format)
	} catch (e) {
		console.error(e)
	}
}

run()
