import { getPiecesForFeed } from '$lib/feeds/utils'
import { renderPreparedFeedPage } from '$lib/feeds/page.server.js'
import { config } from '$lib/server/config'
import { error } from '@sveltejs/kit'
import { isConfiguredPieceType } from '$lib/pieces/types.server.js'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, url }) => {
	const { piece: type } = params
	if (type && !isConfiguredPieceType(type)) {
		error(404, 'piece type not found')
	}

	const pieces = await getPiecesForFeed(type)
	const feed = {
		url: `${config.url.app}/rss/pieces${type ? '/' + encodeURIComponent(type) : ''}/feed.xml`,
		type: 'piece' as const,
		label: type || 'all'
	}
	const presentation = await renderPreparedFeedPage({ feed, pieces, url })

	return {
		pieces,
		type,
		meta: {
			title: type ? `RSS feed | ${type}` : 'RSS feed | all',
			description: type ? `an RSS feed for ${type}` : 'RSS feed for all pieces'
		},
		feed,
		presentation
	}
}
