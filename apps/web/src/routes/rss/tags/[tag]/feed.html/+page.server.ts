import { getPiecesForTagFeed } from '#lib/feeds/utils.js'
import { loadPageMarkdown } from '#lib/server/pages.js'
import { config } from '#lib/server/config.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
	const { tag } = params
	const pieces = await getPiecesForTagFeed(tag)
	const feed = {
		url: `${config.url.app}/rss/tags/${encodeURIComponent(tag)}/feed.xml`,
		type: 'tag' as const,
		label: tag
	}
	const about = await loadPageMarkdown(config.pages.feed.about)

	return {
		pieces,
		tag,
		meta: {
			title: `RSS feed | tag: ${tag}`,
			description: `an RSS feed for pieces tagged with ${tag}`
		},
		feed,
		about,
		links: config.pages.feed.links
	}
}
