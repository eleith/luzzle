#! /usr/bin/env node

import { createWriteStream, mkdirSync, WriteStream } from 'fs'
import { Resvg } from '@resvg/resvg-js'
import { getItems, getLastRun, storeLastRun } from './utils.js'
import { bookToHtml } from './books.js'
import { linkToHtml } from './links.js'
import { image, outputPng, outputSvg } from './template.js'
import { textToHtml } from './texts.js'
import parseArgs from './yargs.js'
import { hideBin } from 'yargs/helpers'
import { getDatabaseClient, Pieces, PieceSelectable } from '@luzzle/kysely'

async function makeOgImage(html: JSX.Element, writeStream: WriteStream, output: 'svg' | 'png') {
	switch (output) {
		case 'svg':
			return outputSvg(writeStream, await image(html))
		default:
		case 'png':
			return outputPng(
				writeStream,
				await image(html).then((svg) => new Resvg(svg).render().asPng())
			)
	}
}

async function makeManyOgImages(
	folderTo: string,
	items: Array<{ slug: string; html: JSX.Element; file: string }>,
	output: 'png' | 'svg'
) {
	mkdirSync(folderTo, { recursive: true })

	for (const item of items) {
		const file = createWriteStream(item.file)
		await makeOgImage(item.html, file, output)
		console.log(`generated: ${item.slug} as ${output} as ${item.file}`)
	}
}

function itemToHtml<T extends Pieces>(item: PieceSelectable<T>, type: T, folder: string) {
	switch (type) {
		case 'books':
			return bookToHtml(item as PieceSelectable<'books'>, folder)
		case 'links':
			return linkToHtml(item as PieceSelectable<'links'>, folder)
		case 'texts':
		default:
			return textToHtml(item as PieceSelectable<'texts'>, folder)
	}
}

async function run(): Promise<void> {
	try {
		const command = await parseArgs(hideBin(process.argv))
		const folder = command.output
		const lastRun = await getLastRun(folder)
		const db = getDatabaseClient(command.database)
		const output = 'png'
		const type = command.type as Pieces
		const items = await getItems(db, lastRun, type)
		const ogItems = items.map((item) => ({
			slug: item.slug,
			html: itemToHtml(item, type, command.input),
			file: `${folder}/${item.slug}.${output}`,
		}))

		await makeManyOgImages(folder, ogItems, output)
		await storeLastRun(folder, new Date())
	} catch (err) {
		console.error(err)
	}
}

run()
