import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/database'
import { hydrateWithAssets } from '$lib/pieces/assets.server'

export const load: PageServerLoad = async ({ params }) => {
	const type = params.piece
	const slug = params.slug

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

	return { piece }
}
