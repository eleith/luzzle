import { getPiecesForFeed } from '$lib/feeds/utils'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
	const { piece: type } = params
	const pieces = await getPiecesForFeed(type)

	return {
		pieces,
		type,
		meta: {
			title: type ? `RSS feed | ${type}` : 'RSS feed | all',
			description: type ? `an RSS feed for ${type}` : 'RSS feed for all pieces'
		}
	}
}
