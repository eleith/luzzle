import { type WebPieces } from '$lib/pieces/types'
import type { RequestHandler } from './$types'
import {
	PUBLIC_SITE_TITLE,
	PUBLIC_SITE_DESCRIPTION,
	PUBLIC_SITE_URL,
	PUBLIC_IMAGES_URL
} from '$env/static/public'
import { generateRssFeed, generateJsonFeed, type RssFeed, type JsonFeed } from 'feedsmith'
import { getPiecesForFeed } from '$lib/feeds/utils'

type FeedRss = RssFeed<Date>
type FeedJson = JsonFeed<Date>
type FeedItem<T extends FeedRss | FeedJson> = Exclude<T['items'], undefined>[number]
type FeedRssItem = FeedItem<FeedRss>
type FeedJsonItem = FeedItem<FeedJson>

function getRssFeedFromPieces(
	pieces: WebPieces[],
	site: { title: string; description: string; url: string; folder: string; assets: string }
) {
	const feed: FeedRss = {
		title: site.folder,
		description: site.description,
		link: `https://${site.url}`,
		ttl: 60 * 24,
		language: 'en',
		lastBuildDate: new Date(),
		generator: 'feedsmith',
		textInput: {
			title: site.title,
			description: `search ${site.description}`,
			name: site.title,
			link: `https://${site.url}/search`
		},
		image: {
			url: `${site.assets}/images/opengraph.png`,
			description: site.title,
			title: site.title,
			link: `${site.assets}/images/opengraph.png`
		},
		items: pieces.map(
			(piece): FeedRssItem => ({
				title: piece.title,
				link: `https://${site.url}/pieces/${piece.type}/${piece.slug}`,
				description: piece.note || '',
				pubDate: new Date(piece.date_consumed ?? piece.date_added)
			})
		)
	}

	return feed
}

function getJsonFeedFromPieces(
	pieces: WebPieces[],
	site: { title: string; description: string; url: string; folder: string; assets: string }
) {
	const feed: FeedJson = {
		title: site.folder,
		description: site.description,
		home_page_url: `https://${site.url}`,
		language: 'en',
		items: pieces.map(
			(piece): FeedJsonItem => ({
				id: piece.id,
				title: piece.title,
				url: `https://${site.url}/pieces/${piece.type}/${piece.slug}`,
				content_text: piece.note || '',
				date_published: new Date(piece.date_consumed ?? piece.date_added)
			})
		)
	}

	return feed
}

export const GET: RequestHandler = async (event) => {
	const { params } = event
	const { piece: type, format } = params
	const pieces = await getPiecesForFeed(type)

	if (format === 'json') {
		const rss = getJsonFeedFromPieces(pieces, {
			folder: type ? `pieces/${type}` : 'pieces',
			url: PUBLIC_SITE_URL,
			title: PUBLIC_SITE_TITLE,
			description: PUBLIC_SITE_DESCRIPTION,
			assets: PUBLIC_IMAGES_URL
		})

		const body = generateJsonFeed(rss)
		return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
	}

	if (format === 'xml') {
		const rss = getRssFeedFromPieces(pieces, {
			folder: type ? `pieces/${type}` : 'pieces',
			url: PUBLIC_SITE_URL,
			title: PUBLIC_SITE_TITLE,
			description: PUBLIC_SITE_DESCRIPTION,
			assets: PUBLIC_IMAGES_URL
		})
		const stylesheets = [{ type: 'text/css', href: '/css/feed.css' }]
		const body = generateRssFeed(rss as RssFeed<Date>, { stylesheets })
		return new Response(body, { headers: { 'content-type': 'application/xml' } })
	}

	return new Response('Not Found', { status: 404 })
}
