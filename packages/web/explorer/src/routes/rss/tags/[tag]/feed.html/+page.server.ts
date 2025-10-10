import { getPiecesForTagFeed } from '$lib/feeds/utils'
import { loadBlock } from '$lib/server/content'
import feedMarkdown from '$lib/content/block/feed.md?raw'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
	const { tag } = params
	const pieces = await getPiecesForTagFeed(tag)
	const block = await loadBlock(feedMarkdown)

	return {
		pieces,
		tag,
		meta: {
			title: `RSS feed | tag: ${tag}`,
			description: `an RSS feed for pieces tagged with ${tag}`
		},
		block
	}
}
