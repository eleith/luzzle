import { createWriteStream, readFileSync, mkdirSync, writeFileSync } from 'fs'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import ReactDomServer from 'react-dom/server'
import { loadEnvConfig } from '@next/env'
import { getDatabaseClient, Book } from '@luzzle/kysely'
import { Writable } from 'stream'
import { createHash } from 'crypto'

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production')

const BookCoverSize = {
	SMALL: 'SMALL',
	MEDIUM: 'MEDIUM',
	LARGE: 'LARGE',
} as const

const fontNotoSans = readFileSync('./public/fonts/NotoSans-Regular.ttf')
const OpenGraphBooksFolder = './public/images/og/books'
const OpenGraphImageWidth = 1200
const OpenGraphImageHeight = 600

const BookColors = ['#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#fe8019']

const sizes = {
	SMALL: {
		width: 200 * 0.9,
		height: 300 * 0.9,
		thickness: 50 * 0.9,
	},
	MEDIUM: {
		width: 200,
		height: 300,
		thickness: 50,
	},
	LARGE: {
		width: 200 * 1.1,
		height: 300 * 1.1,
		thickness: 50 * 1.1,
	},
}

function getColor(slug: string): typeof BookColors[number] {
	const numColors = BookColors.length
	const hex = createHash('sha256').update(slug).digest('hex')
	const random = parseInt(hex, 16) % numColors

	return BookColors[random]
}

function getImageBase64(slug: string): string {
	const image = readFileSync(
		`${process.env.LUZZLE_FOLDER}/books/.assets.cache/covers/${slug}.w500.jpg`
	)
	const base64 = image.toString('base64')
	return `data:image/jpeg;base64,${base64}`
}

function getSize(pages?: number | null, scale = 1): typeof sizes[keyof typeof BookCoverSize] {
	let size = sizes.SMALL
	if (pages) {
		if (pages >= 700) {
			size = sizes.LARGE
		} else if (pages && pages >= 320) {
			size = sizes.MEDIUM
		}
	}
	return {
		width: size.width * scale,
		height: size.height * scale,
		thickness: size.thickness * scale,
	}
}

/* eslint-disable @next/next/no-img-element */
function openGraphImageHtml(book: Book) {
	const color = getColor(book.slug)
	const size = getSize(book.pages, 1.5)
	const url = getImageBase64(book.slug)

	const cover = url ? (
		<img
			alt={''}
			src={url}
			style={{
				width: size.width,
				height: size.height,
				objectFit: 'cover',
				boxShadow: '-11px 11px 15px #000',
				alignSelf: 'center',
			}}
		/>
	) : (
		<div
			style={{
				backgroundColor: color,
				width: size.width,
				height: size.height,
				objectFit: 'cover',
				boxShadow: '-11px 11px 15px #000',
				alignSelf: 'center',
			}}
		/>
	)

	return (
		<div
			style={{
				display: 'flex',
				background: '#fbf1c7',
				color: '#3c3836',
			}}
		>
			<div
				style={{
					display: 'flex',
					width: `${OpenGraphImageWidth * 0.35}px`,
					justifyContent: 'center',
				}}
			>
				{cover}
			</div>
			<div
				style={{
					display: 'flex',
					padding: '20px',
					flexDirection: 'column',
					justifyContent: 'center',
					height: OpenGraphImageHeight,
					width: `${OpenGraphImageWidth * 0.65}px`,
				}}
			>
				<span style={{ fontSize: '64px' }}> {book.title} </span>
				<span style={{ fontSize: '32px' }}> {book.subtitle} </span>
			</div>
		</div>
	)
}

async function image(html: JSX.Element) {
	return satori(html, {
		width: OpenGraphImageWidth,
		height: OpenGraphImageHeight,
		fonts: [
			{
				name: 'Noto Sans',
				weight: 400,
				style: 'normal',
				data: fontNotoSans,
			},
		],
	})
}

function ouputSvg(res: Writable, svg: string) {
	res.write(svg)
	res.end()
}

function ouputPng(res: Writable, png: Buffer) {
	res.write(png)
	res.end()
}

function ouputHtml(res: Writable, html: JSX.Element) {
	res.write(ReactDomServer.renderToStaticMarkup(html))
	res.end()
}

async function handler(book: Book, output: 'svg' | 'png' | 'html') {
	const html = openGraphImageHtml(book)
	const file = createWriteStream(`${OpenGraphBooksFolder}/${book.slug}.${output}`)

	switch (output) {
		case 'svg':
			return ouputSvg(file, await image(html))
		case 'html':
			return ouputHtml(file, html)
		default:
		case 'png':
			return ouputPng(file, await image(html).then((svg) => new Resvg(svg).render().asPng()))
	}
}

async function getLastRun(defaultDate = new Date(0)) {
	try {
		const lastRun = readFileSync(`${OpenGraphBooksFolder}/.generate-last-run`, 'utf-8')
		const lastRunDate = new Date(lastRun)

		if (!isNaN(lastRunDate as unknown as number)) {
			return lastRunDate.getTime()
		}

		throw new Error('Invalid date')
	} catch (e) {
		return defaultDate.getTime()
	}
}

async function storeLastRun(date: Date) {
	writeFileSync(`${OpenGraphBooksFolder}/.generate-last-run`, date.toISOString())
}

async function main() {
	mkdirSync(OpenGraphBooksFolder, { recursive: true })

	const lastRun = await getLastRun(new Date(0))
	const db = getDatabaseClient(`${process.env.LUZZLE_FOLDER}/luzzle.sqlite`)
	const books = await db
		.selectFrom('books')
		.where((eb) =>
			eb.or([
				eb.and([eb.bxp('date_added', '>=', lastRun), eb.bxp('date_updated', 'is', null)]),
				eb.and([eb.bxp('date_updated', 'is not', null), eb.bxp('date_updated', '>=', lastRun)]),
			])
		)
		.selectAll()
		.execute()

	for (const book of books) {
		if (book.cover_path) {
			await handler(book, 'png')
			console.log(`generated: ${book.slug}.png`)
		}
	}

	await storeLastRun(new Date())
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(() => {
		console.log('complete: generate-og-images')
	})
