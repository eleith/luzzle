import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/database'
import { getOpenGraphPath } from '@luzzle/tools/browser'
import { config } from '$lib/server/config'

export const load: PageServerLoad = async (page) => {
	const type = page.params.piece
	const slug = page.params.slug

	const piece = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where('type', '=', type)
		.where('slug', '=', slug)
		.executeTakeFirst()

	if (!piece) {
		return error(404, `piece does not exist`)
	}

	const tags = await db
		.selectFrom('web_pieces_tags')
		.selectAll()
		.where('piece_id', '=', piece.id)
		.execute()

	return {
		piece,
		tags,
		meta: {
			title: piece.title,
			type: piece.type,
			description: piece.note || piece.summary,
			image: `${config.url.luzzle_assets}/pieces/assets/${getOpenGraphPath(piece.type, piece.id)}`
		}
	}
}
