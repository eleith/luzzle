import { getPiecesForFeed } from '$lib/feeds/utils'
import { error } from '@sveltejs/kit'
import { isConfiguredPieceType } from '$lib/pieces/types.server.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
	const { piece: type } = params
	if (type && !isConfiguredPieceType(type)) {
		error(404, 'piece type not found')
	}

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
