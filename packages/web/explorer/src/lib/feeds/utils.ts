import { type WebPieces } from '$lib/pieces/types'
import { getDatabase } from '$lib/database'
import { negotiate } from '$lib/utils/http'
import type { Cookies } from '@sveltejs/kit'

const MAX_FEED_ITEMS = 50
const WANTS_HTML_FEED_COOKIE = 'luzzle-feed-wants-html'

async function getPiecesForFeed(type: WebPieces['type'] | undefined) {
	const db = getDatabase()

	let pieceQuery = db
		.selectFrom('web_pieces')
		.selectAll()
		.orderBy('date_consumed', 'desc')
		.limit(MAX_FEED_ITEMS)

	if (type) {
		pieceQuery = pieceQuery.where('type', '=', type)
	}

	return pieceQuery.execute()
}

function hasSeenHtmlFeed(cookies: Cookies) {
	return cookies.get(WANTS_HTML_FEED_COOKIE) === 'true'	
}

function rememberHasSeenHtmlFeed(cookies: Cookies) {
	const twoHours = 2 * 60 * 60 * 1000

	cookies.set(WANTS_HTML_FEED_COOKIE, 'true', {
		expires: new Date(Date.now() + twoHours),
		path: '/'
	})
}

function mightWantHtmlFeed(request: Request, cookies: Cookies) {
	const hasSeenHtml = hasSeenHtmlFeed(cookies)
	const acceptHeader = request.headers.get('accept') || ''
	const prefersHtml = negotiate(acceptHeader, ['application/xml', 'text/html']) === 'text/html'

	return !hasSeenHtml && prefersHtml
}

export { getPiecesForFeed, mightWantHtmlFeed, hasSeenHtmlFeed, rememberHasSeenHtmlFeed }
