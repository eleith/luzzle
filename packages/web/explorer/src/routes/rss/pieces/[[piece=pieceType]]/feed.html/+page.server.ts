import { getPiecesForFeed } from '$lib/feeds/utils'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
	const { piece: type } = params
	const pieces = await getPiecesForFeed(type)

	return {
		pieces,
		type
	}
}
