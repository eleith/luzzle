#! /usr/bin/env node

import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { generateOpenGraphForPiece } from './opengraph.js'
import { exec } from 'child_process'
import { Pieces, StorageFileSystem } from '@luzzle/cli'
import { temporaryWrite } from 'tempy'
import { getBrowser, shutdownBrowser } from './browser.js'

async function openBuffer(
	buffer: Buffer | string | Uint8Array<ArrayBufferLike>,
	extension: string
) {
	const tmp = await temporaryWrite(buffer, { extension })
	const cmd = `xdg-open "${tmp}"`

	exec(cmd, (error) => {
		if (error) {
			console.error(`Failed to open browser: ${error.message}`)
			return
		}
	})
}

async function run() {
	const browser = await getBrowser()

	try {
		const command = await parseArgs(hideBin(process.argv))
		const templates = command.templates
		const luzzle = command.luzzle
		const file = command.file
		const format = file ? (command.format as 'html' | 'png' | 'svg') : 'png'

		const storage = new StorageFileSystem(luzzle)
		const pieces = new Pieces(storage)
		const pieceInfo = pieces.parseFilename(file)

		if (pieceInfo.type) {
			const piece = await pieces.getPiece(pieceInfo.type)
			const pieceMarkdown = await piece.get(pieceInfo.file)
			const og = await generateOpenGraphForPiece(pieceMarkdown, templates, format, luzzle, browser)

			await openBuffer(og, format)
		}
	} catch (error) {
		throw new Error(`Generation failed ${error}`)
	} finally {
		shutdownBrowser(browser)
	}
}

run()
