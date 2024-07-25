#! /usr/bin/env node

import { Feed, Item } from 'feed'
import { writeFile, mkdir } from 'fs/promises'
import { hideBin } from 'yargs/helpers'
import parseArgs from './yargs.js'
import { WebPieceType, WebPieces, getDatabase } from '../lib/web.js'

async function generateRss(
	pieces: WebPieces[],
	site: { title: string; description: string; url: string; folder: string },
	output: string
) {
	const feed = new Feed({
		title: site.title,
		description: site.description,
		id: `https://${site.url}/${site.folder}`,
		link: `https://${site.url}`,
		ttl: 60 * 24,
		// image,
		// favicon,
		updated: new Date(),
		generator: 'jpmonette/feed',
		language: 'en',
		copyright: `🄯 ${new Date().getUTCFullYear()}`,
		feedLinks: {
			rss2: `https://${site.url}/rss/${site.folder}/feed.xml`,
			json: `https://${site.url}/rss/${site.folder}/feed.json`,
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
			link: `https://${site.url}/pieces/${piece.type}/${piece.slug}`,
			image: `https://${site.url}/images/og/${piece.type}/${piece.slug}.png`,
			description: piece.note || '',
			content: piece.note || '',
			date: new Date(piece.date_consumed ?? piece.date_added),
		}

		return item
	})

	items.forEach((item) => {
		feed.addItem(item)
	})

	await mkdir(`${output}/${site.folder}`, { recursive: true })

	await writeFile(`${output}/${site.folder}/feed.json`, feed.json1())

	// https://github.com/jpmonette/feed/issues/140
	await writeFile(
		`${output}/${site.folder}/feed.xml`,
		feed
			.rss2()
			.replace(
				'<?xml version="1.0" encoding="utf-8"?>',
				`<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet type="text/xsl" href="../feed.xslt"?>`
			)
	)
}

async function getItems(type: WebPieceType, db: ReturnType<typeof getDatabase>) {
	let piecesQuery = db.selectFrom('web_pieces').limit(50)

	if (type) {
		piecesQuery = piecesQuery.where('type', '=', type)
	}

	return await piecesQuery.orderBy('date_consumed', 'desc').selectAll().execute()
}

async function run(): Promise<void> {
	try {
		const command = await parseArgs(hideBin(process.argv))
		const db = getDatabase(command.database)
		const type = command.type as WebPieceType
		const pieces = await getItems(type, db)

		generateRss(
			pieces,
			{
				folder: type ? `pieces/${type}` : 'pieces',
				url: command.url,
				title: command.title,
				description: command.description,
			},
			command.output
		)
	} catch (err) {
		console.error(err)
	}
}

run()
