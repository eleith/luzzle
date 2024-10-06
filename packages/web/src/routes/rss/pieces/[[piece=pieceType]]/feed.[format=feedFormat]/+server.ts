import { type WebPieces } from '$lib/pieces/types'
import type { RequestHandler } from './$types'
import { Feed, type Item } from 'feed'
import { PUBLIC_SITE_TITLE, PUBLIC_SITE_DESCRIPTION } from '$env/static/public'
import { getDatabase } from '$lib/database'

const MAX_ITEM_LIMIT = 50

function generateRss(
	pieces: WebPieces[],
	site: { title: string; description: string; url: string; folder: string }
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
			json: `https://${site.url}/rss/${site.folder}/feed.json`
		}
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
			date: new Date(piece.date_consumed ?? piece.date_added)
		}

		return item
	})

	items.forEach((item) => {
		feed.addItem(item)
	})

	return feed
}

export const GET: RequestHandler = async (a) => {
	const type = a.params.piece
	const isJson = a.params.format === 'json'
	const db = getDatabase()

	let pieceQuery = db
		.selectFrom('web_pieces')
		.selectAll()
		.orderBy('date_consumed', 'desc')
		.limit(MAX_ITEM_LIMIT)

	if (type) {
		pieceQuery = pieceQuery.where('type', '=', type)
	}

	const pieces = await pieceQuery.execute()

	const rss = generateRss(pieces, {
		folder: type ? `pieces/${type}` : 'pieces',
		url: 'https://example.com',
		title: PUBLIC_SITE_TITLE,
		description: PUBLIC_SITE_DESCRIPTION
	})

	const contentType = isJson ? 'application/json' : 'text/xml'
	const body = isJson
		? rss.json1()
		: rss
				.rss2()
				.replace(
					'<?xml version="1.0" encoding="utf-8"?>',
					`<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet type="text/xsl" href="/rss/feed.xslt"?>`
				)

	return new Response(body, { headers: { 'content-type': contentType } })
}

export const prerender = true
