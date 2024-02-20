import { Feed, Item } from 'feed'
import { writeFile, mkdir } from 'fs/promises'
import { loadEnvConfig } from '@next/env'
import { getDatabaseClient, LuzzleSelectable } from '@luzzle/kysely'

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production')

async function generateRss(pieces: LuzzleSelectable<'pieces'>[], folder: string) {
	const feed = new Feed({
		title: process.env.SITE_TITLE || '',
		description: process.env.SITE_DESCRIPTION,
		id: `${process.env.NEXT_PUBLIC_HOST}/${folder}`,
		link: process.env.NEXT_PUBLIC_HOST,
		ttl: 60 * 24,
		// image,
		// favicon,
		updated: new Date(),
		generator: 'jpmonette/feed',
		language: 'en',
		copyright: `🄯 ${new Date().getUTCFullYear()}`,
		feedLinks: {
			rss2: `${process.env.NEXT_PUBLIC_HOST}/rss/${folder}/feed.xml`,
			json: `${process.env.NEXT_PUBLIC_HOST}/rss/${folder}/feed.json`,
		},
		// author: {
		//   name: '',
		//   email: '',
		//   link: '',
		// },
	})

	const items = pieces?.map((piece) => {
		const item: Item = {
			title: piece.title,
			link: `${process.env.NEXT_PUBLIC_HOST}/pieces/${piece.type}/${piece.slug}`,
			image: `${process.env.NEXT_PUBLIC_HOST_STATIC}/images/og/${piece.type}/${piece.slug}.png`,
			description: piece.note || '',
			content: piece.note || '',
			date: new Date(piece.date_consumed ?? piece.date_added),
		}

		return item
	})

	items.forEach((item) => {
		feed.addItem(item)
	})

	await mkdir(`./public/rss/${folder}`, { recursive: true })

	// https://github.com/jpmonette/feed/issues/140
	await writeFile(
		`./public/rss/${folder}/feed.xml`,
		feed
			.rss2()
			.replace(
				'<?xml version="1.0" encoding="utf-8"?>',
				`<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet type="text/xsl" href="../feed.xslt"?>`
			)
	)
}

async function main() {
	const db = getDatabaseClient(`${process.env.LUZZLE_FOLDER}/luzzle.sqlite`)
	const books = await db
		.selectFrom('pieces')
		.limit(50)
		.where('type', '=', 'books')
		.orderBy('date_consumed', 'desc')
		.selectAll()
		.execute()

	generateRss(books, 'pieces/books')

	const links = await db
		.selectFrom('pieces')
		.limit(50)
		.where('type', '=', 'links')
		.orderBy('date_consumed', 'desc')
		.selectAll()
		.execute()

	generateRss(links, 'pieces/links')

	const pieces = await db
		.selectFrom('pieces')
		.limit(50)
		.orderBy('date_consumed', 'desc')
		.selectAll()
		.execute()

	generateRss(pieces, 'pieces')
}

main()
	.catch((err) => {
		console.error(err)
		process.exit(1)
	})
	.finally(() => {
		console.log('complete: rss generation')
	})
