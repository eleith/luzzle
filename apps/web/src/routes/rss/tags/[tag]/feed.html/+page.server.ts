import { getPiecesForTagFeed } from '$lib/feeds/utils'
import { renderPreparedFeedPage } from '$lib/feeds/page.server.js'
import { config } from '$lib/server/config'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, url }) => {
	const { tag } = params
	const pieces = await getPiecesForTagFeed(tag)
	const feed = {
		url: `${config.url.app}/rss/tags/${encodeURIComponent(tag)}/feed.xml`,
		type: 'tag' as const,
		label: tag
	}
	const presentation = await renderPreparedFeedPage({ feed, pieces, url })

	return {
		pieces,
		tag,
		meta: {
			title: `RSS feed | tag: ${tag}`,
			description: `an RSS feed for pieces tagged with ${tag}`
		},
		feed,
		presentation
	}
}
