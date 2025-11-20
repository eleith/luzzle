import { type WebPieces } from '@luzzle/web.utils'
import type { RequestHandler } from './$types'
import { config } from '$lib/server/config'
import { generateRssFeed, generateJsonFeed, type RssFeed, type JsonFeed } from 'feedsmith'
import { getPiecesForTagFeed } from '$lib/feeds/utils'
import YAML from 'yaml'

type FeedRss = RssFeed<Date>
type FeedJson = JsonFeed<Date>
type FeedItem<T extends FeedRss | FeedJson> = Exclude<T['items'], undefined>[number]
type FeedRssItem = FeedItem<FeedRss>
type FeedJsonItem = FeedItem<FeedJson>

function getRssFeedFromPieces(pieces: WebPieces[], tag?: string) {
	const feedTitle = tag ? `${config.text.title} | tag: ${tag}` : config.text.title
	const feed: FeedRss = {
		title: feedTitle,
		description: config.text.description,
		link: config.url.app,
		ttl: 60 * 24,
		language: 'en',
		lastBuildDate: new Date(),
		generator: 'feedsmith',
		textInput: {
			title: config.text.title,
			description: `search ${config.text.description}`,
			name: config.text.title,
			link: `${config.url.app}/search`
		},
		image: {
			url: `${config.url.app_assets}/images/opengraph.png`,
			description: config.text.title,
			title: config.text.title,
			link: `${config.url.app_assets}/images/opengraph.png`
		},
		items: pieces.map(
			(piece): FeedRssItem => ({
				title: piece.title,
				link: `${config.url.app}/pieces/${piece.type}/${piece.slug}`,
				description: piece.note || '',
				pubDate: new Date(piece.date_consumed ?? piece.date_added)
			})
		)
	}

	return feed
}

function getJsonFeedFromPieces(pieces: WebPieces[], tag?: string) {
	const feedTitle = tag ? `${config.text.title} | tag: ${tag}` : config.text.title
	const feed: FeedJson = {
		title: feedTitle,
		description: config.text.description,
		home_page_url: config.url.app,
		language: 'en',
		items: pieces.map(
			(piece): FeedJsonItem => ({
				id: piece.id,
				title: piece.title,
				url: `${config.url.app}/pieces/${piece.type}/${piece.slug}`,
				content_text: piece.note || '',
				date_published: new Date(piece.date_consumed ?? piece.date_added)
			})
		)
	}

	return feed
}

function getMarkdownFeedFromPieces(pieces: WebPieces[], tag?: string) {
	const feedTitle = tag ? `${config.text.title} | tag: ${tag}` : config.text.title
	const frontmatter = YAML.stringify({
		title: feedTitle,
		description: config.text.description,
		link: config.url.app,
		language: 'en',
		lastBuildDate: new Date(),
		generator: 'luzzle'
	})

	const title = tag ? `RSS feed for tag: ${tag}` : 'RSS feed for all pieces'
	const body = pieces
		.map((piece) => {
			const date = new Date(piece.date_consumed ?? piece.date_added).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			})
			const note = piece.note
				? `

> ${piece.note}`
				: ''
			return `## [${piece.title}](${`${config.url.app}/pieces/${piece.type}/${piece.slug}`})\n*${date}*${note}`
		})
		.join('\n\n---\n\n')

	return `---\n${frontmatter}---\n\n# ${title}\n\n${body}`
}

export const GET: RequestHandler = async (event) => {
	const { params } = event
	const { tag, format } = params
	const pieces = await getPiecesForTagFeed(tag)

	if (format === 'json') {
		const rss = getJsonFeedFromPieces(pieces, tag)
		const body = generateJsonFeed(rss)
		return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
	}

	if (format === 'xml') {
		const rss = getRssFeedFromPieces(pieces, tag)
		const stylesheets = [{ type: 'text/css', href: '/css/feed.css' }]
		const body = generateRssFeed(rss as RssFeed<Date>, { stylesheets })
		return new Response(body, { headers: { 'content-type': 'application/xml' } })
	}

	if (format === 'md') {
		const body = getMarkdownFeedFromPieces(pieces, tag)
		return new Response(body, { headers: { 'content-type': 'text/markdown' } })
	}

	return new Response('Not Found', { status: 404 })
}
