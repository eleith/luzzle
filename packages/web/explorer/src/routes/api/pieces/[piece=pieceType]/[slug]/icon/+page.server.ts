import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/database'

import type { PieceMode } from '$lib/pieces/helpers'

export const load: PageServerLoad = async (page) => {
	const type = page.params.piece
	const slug = page.params.slug
	const mode = (page.url.searchParams.get('mode') as PieceMode) || 'public'

	const piece = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where('type', '=', type)
		.where('slug', '=', slug)
		.executeTakeFirst()

	if (!piece) {
		return error(404, `piece does not exist`)
	}

	return {
		piece,
		mode
	}
}
