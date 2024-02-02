/* stylelint-disable @typescript-eslint/no-unused-vars */
import { createWriteStream, mkdirSync, WriteStream } from 'fs'
import { Resvg } from '@resvg/resvg-js'
import { finalize, getItems, initialize } from './utils'
import { bookToHtml } from './og/books'
import { linkToHtml } from './og/links'
import { image, ouputHtml, ouputPng, ouputSvg } from './og/template'

const OpenGraphFolder = './public/images/og'

async function makeOgImage(
	html: JSX.Element,
	writeStream: WriteStream,
	output: 'svg' | 'png' | 'html'
) {
	switch (output) {
		case 'svg':
			return ouputSvg(writeStream, await image(html))
		case 'html':
			return ouputHtml(writeStream, html)
		default:
		case 'png':
			return ouputPng(writeStream, await image(html).then((svg) => new Resvg(svg).render().asPng()))
	}
}

async function makeManyOgImages(
	folderTo: string,
	items: Array<{ slug: string; html: JSX.Element; file: string }>,
	output: 'png' | 'svg' | 'html'
) {
	mkdirSync(folderTo, { recursive: true })

	for (const item of items) {
		const file = createWriteStream(item.file)
		await makeOgImage(item.html, file, output)
		console.log(`generated: ${item.slug} as ${output} as ${item.file}`)
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function main() {
	const { lastRun, db } = await initialize(OpenGraphFolder)
	const output = 'png'

	const books = await getItems(db, lastRun, 'books')
	const bookItems = books.map((book) => ({
		slug: book.slug,
		html: bookToHtml(book),
		file: `${OpenGraphFolder}/books/${book.slug}.${output}`,
	}))
	makeManyOgImages(`${OpenGraphFolder}/books`, bookItems, output)

	const links = await getItems(db, lastRun, 'links')
	const linkItems = links.map((link) => ({
		slug: link.slug,
		html: linkToHtml(link),
		file: `${OpenGraphFolder}/links/${link.slug}.${output}`,
	}))
	makeManyOgImages(`${OpenGraphFolder}/links`, linkItems, output)

	await finalize(OpenGraphFolder, new Date())
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(() => {
		console.log('complete: generate-og-images')
	})
