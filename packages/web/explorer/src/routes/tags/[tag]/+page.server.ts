import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/database'
import { hydrateWithAssets } from '$lib/pieces/assets.server'

const TAKE_DEFAULT = 50

export const load: PageServerLoad = async (page) => {
	const tag = page.params.tag

	const pieceTags = await db
		.selectFrom('web_pieces_tags')
		.selectAll()
		.where('slug', '=', tag)
		.execute()

	if (!pieceTags.length) {
		return error(404, 'tag not found')
	}

	const ids = pieceTags.map((x) => x.piece_id)

	const pieces = await hydrateWithAssets(
		await db
			.selectFrom('web_pieces')
			.selectAll()
			.where('id', 'in', ids)
			.orderBy('date_consumed', 'desc')
			.limit(TAKE_DEFAULT + 1)
			.execute()
	)

	const hasMore = pieces.length === TAKE_DEFAULT + 1
	if (hasMore) {
		pieces.pop()
	}

	return {
		pieces,
		nextPage: hasMore ? 2 : null,
		prevPage: null,
		tag
	}
}
