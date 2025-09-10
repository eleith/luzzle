#! /usr/bin/env node

import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { generatePng } from './png.js'
import { exec } from 'child_process'
import { temporaryWrite } from 'tempy'
import { getBrowser, shutdownBrowser } from './browser.js'
import { generateHtml } from './html.js'
import { readFile } from 'fs/promises'
import { extractFullMarkdown, makePieceMarkdown } from '@luzzle/core'
import { PieceFrontmatter } from '@luzzle/cli'

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
		const template = command.template
		const luzzle = command.luzzle
		const file = command.file
		const format = file ? (command.format as 'html' | 'png') : 'png'

		// const storage = new StorageFileSystem(luzzle)
		// const pieces = new Pieces(storage)
		// const piece = pieces.parseFilename(file)
		const contents = await readFile(file)
		const markdown = await extractFullMarkdown(contents)
		const pieceMarkdown = makePieceMarkdown(
			file,
			'book',
			markdown.markdown,
			markdown.frontmatter as PieceFrontmatter
		)

		const ogHtml = await generateHtml(pieceMarkdown, luzzle, template)
		const ogPng = await generatePng(ogHtml, browser)

		await openBuffer(ogPng, format)
	} catch (error) {
		throw new Error(`Generation failed ${error}`)
	} finally {
		await shutdownBrowser(browser)
	}
}

run()
