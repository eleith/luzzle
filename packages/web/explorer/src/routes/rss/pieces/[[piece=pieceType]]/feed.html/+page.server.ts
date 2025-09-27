import { getPiecesForFeed } from '$lib/feeds/utils'
import { loadBlock } from '$lib/server/content'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
	const { piece: type } = params
	const pieces = await getPiecesForFeed(type)
	const block = await loadBlock('feed')

	return {
		pieces,
		type,
		meta: {
			title: type ? `RSS feed | ${type}` : 'RSS feed | all',
			description: type ? `an RSS feed for ${type}` : 'RSS feed for all pieces'
		},
		block
	}
}
