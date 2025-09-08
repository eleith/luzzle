#! /usr/bin/env node

import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { generateOpenGraphForPiece } from './opengraph.js'
import { exec } from 'child_process'
import { Pieces, StorageFileSystem } from '@luzzle/cli'

async function run() {
	try {
		const command = await parseArgs(hideBin(process.argv))
		const templates = command.templates
		const luzzle = command.luzzle
		const output = command.output
		const format = output ? 'png' : (command.format as 'html' | 'png' | 'svg')

		const storage = new StorageFileSystem(luzzle)
		const pieces = new Pieces(storage)
		const files = await pieces.getFilesIn('.', { deep: true })
		const onePiece = pieces.parseFilename(files.pieces[0])

		if (onePiece && onePiece.type) {
			const piece = await pieces.getPiece(onePiece.type)
			const pieceMarkdown = await piece.get(onePiece.file)
			const tmp = await generateOpenGraphForPiece(pieceMarkdown, templates, format, luzzle)
			const cmd = `xdg-open "${tmp}"`

			exec(cmd, (error) => {
				if (error) {
					console.error(`Failed to open browser: ${error.message}`)
					return
				}
			})
		}
	} catch (error) {
		console.error('Error during generation:', error)
	}
}

run()
