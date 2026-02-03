import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/database'
import { getPalette } from '@luzzle/web.utils/server'
import { config } from '$lib/server/config'
import { getImageAssetPath, type PieceIconPalette } from '@luzzle/web.utils'
import type { PieceMode } from '$lib/pieces/helpers'
import { Buffer } from 'buffer'
import { dev } from '$app/environment'

export const load: PageServerLoad = async ({ params, url, fetch }) => {
	const type = params.piece
	const slug = params.slug
	const mode = (url.searchParams.get('mode') as PieceMode) || 'public'

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

	let palette: PieceIconPalette | undefined

	if (mediaPath) {
		if (mode === 'local') {
			const port = process.env.PORT || (dev ? 5173 : 3000)
			const origin = `http://localhost:${port}`
			const response = await fetch(`${origin}/pieces/assets/${mediaPath}`)

			if (response.ok) {
				const buffer = Buffer.from(await response.arrayBuffer())
				palette = (await getPalette(buffer)) as PieceIconPalette
			}
		} else {
			const baseUrl = config.url.luzzle_assets || config.url.app
			const mediaUrl = `${baseUrl}/pieces/assets/${mediaPath}`
			palette = (await getPalette(mediaUrl)) as PieceIconPalette
		}
	}

	return {
		piece,
		palette,
		mode
	}
}
