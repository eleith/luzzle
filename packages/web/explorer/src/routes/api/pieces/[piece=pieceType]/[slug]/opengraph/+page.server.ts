import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/database'
import { getPalette } from '@luzzle/web.utils/server'
import { config } from '$lib/server/config'
import { getImageAssetPath, type PieceIconPalette } from '@luzzle/web.utils'
import type { PieceMode } from '$lib/pieces/helpers'
import fs from 'node:fs/promises'
import path from 'node:path'

export const load: PageServerLoad = async ({ params, url }) => {
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
			try {
				const assetsDir = path.resolve('static/pieces/assets')
				const filePath = path.join(assetsDir, mediaPath)
				const buffer = await fs.readFile(filePath)
				palette = (await getPalette(buffer)) as PieceIconPalette
			} catch (e) {
				console.error(`[OpenGraph] Failed to read local asset: ${mediaPath}`, e)
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
