import { getPiecesForTagFeed } from '$lib/feeds/utils'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
	const { tag } = params
	const pieces = await getPiecesForTagFeed(tag)

	return {
		pieces,
		tag,
		meta: {
			title: `RSS feed | tag: ${tag}`,
			description: `an RSS feed for pieces tagged with ${tag}`
		}
	}
}
