import { getPiecesForTagFeed } from '$lib/feeds/utils'
import { loadBlock } from '$lib/server/content'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
	const { tag } = params
	const pieces = await getPiecesForTagFeed(tag)
	const block = await loadBlock('feed')

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
