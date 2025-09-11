#! /usr/bin/env node

import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { generatePng } from './png.js'
import { exec } from 'child_process'
import { temporaryWrite } from 'tempy'
import { getBrowser } from './browser.js'
import { generateHtml } from './html.js'
import { Pieces, StorageFileSystem } from '@luzzle/cli'

async function openBuffer(
	buffer: Buffer | string | Uint8Array<ArrayBufferLike>,
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
	const template = command.template
	const luzzle = command.luzzle
	const file = command.file
	const format = file ? (command.format as 'html' | 'png') : 'png'

	const storage = new StorageFileSystem(luzzle)
	const pieces = new Pieces(storage)
	const markdown = await pieces.getPieceMarkdown(file)
	const browser = await getBrowser()

	const ogHtml = await generateHtml(markdown, pieces, template)

	if (format === 'png') {
		const ogPng = await generatePng(ogHtml, browser)
		await openBuffer(ogPng, format)
	} else {
		await openBuffer(ogHtml, format)
	}

	await browser.close()
}

run()
