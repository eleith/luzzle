import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/database'
import { hydrateWithAssets } from '$lib/pieces/assets.server'

import type { PieceMode } from '$lib/pieces/helpers'

export const load: PageServerLoad = async (page) => {
	const type = page.params.piece
	const slug = page.params.slug
	const mode = (page.url.searchParams.get('mode') as PieceMode) || 'public'

	const webPiece = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where('type', '=', type)
		.where('slug', '=', slug)
		.executeTakeFirst()

	if (!webPiece) {
		return error(404, `piece does not exist`)
	}
	const piece = await hydrateWithAssets(webPiece)

	return {
		piece,
		mode
	}
}
