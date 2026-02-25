import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db, mapRowsToWebPieces } from '$lib/server/database'
import { getPalette } from '@luzzle/web.utils/server'
import { getImageAssetPath, type PieceIconPalette } from '@luzzle/web.utils'
import type { PieceMode } from '$lib/pieces/helpers'
import fs from 'node:fs/promises'
import path from 'node:path'

export const load: PageServerLoad = async ({ params, url }) => {
	const type = params.piece
	const slug = params.slug
	const mode = (url.searchParams.get('mode') as PieceMode) || 'public'

	const rows = await db
		.selectFrom('web_pieces')
		.leftJoin('web_pieces_assets', 'web_pieces.file_path', 'web_pieces_assets.piece_file_path')
		.selectAll('web_pieces')
		.select([
			'web_pieces_assets.asset_name',
			'web_pieces_assets.transformation',
			'web_pieces_assets.asset_path',
			'web_pieces_assets.size',
			'web_pieces_assets.mime_type',
			'web_pieces_assets.is_embedded',
			'web_pieces_assets.cached_content'
		])
		.where('web_pieces.type', '=', type)
		.where('web_pieces.slug', '=', slug)
		.execute()

	const pieces = mapRowsToWebPieces(rows)
	const piece = pieces[0]

	if (!piece) {
		return error(404, `piece does not exist`)
	}

	const mediaPath = piece.media
		? getImageAssetPath(piece.type, piece.key, piece.media, 500, 'jpg')
		: null

	let palette: PieceIconPalette | undefined

	if (mediaPath) {
		try {
			const assetsDir = path.resolve('assets/pieces')
			const filePath = path.join(assetsDir, mediaPath)
			const buffer = await fs.readFile(filePath)
			palette = (await getPalette(buffer)) as PieceIconPalette
		} catch (e) {
			console.error(`[OpenGraph] Failed to read local asset: ${mediaPath}`, e)
		}
	}

	return {
		piece,
		palette,
		mode
	}
}
