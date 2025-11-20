import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/database'
import { getPalette } from '@luzzle/web.utils/server'
import { config } from '$lib/server/config'
import { getImageAssetPath, type PieceIconPalette } from '@luzzle/web.utils'

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

	const mediaPath = piece.media
		? getImageAssetPath(piece.type, piece.id, piece.media, 500, 'jpg')
		: null
	const baseUrl = config.url.luzzle_assets || config.url.app
	const mediaUrl = mediaPath ? `${baseUrl}/pieces/assets/${mediaPath}` : null
	const palette = mediaUrl ? ((await getPalette(mediaUrl)) as PieceIconPalette) : undefined

	return {
		piece,
		palette
	}
}
