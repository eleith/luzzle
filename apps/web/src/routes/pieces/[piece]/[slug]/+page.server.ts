import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/database'
import { config } from '$lib/server/config'
import { hydrateWithAssets } from '$lib/pieces/assets.server'
import { assetPathToUrl } from '$lib/pieces/assets.js'
import { renderPreparedPiecePage } from '$lib/server/piece-page.js'

export const load: PageServerLoad = async (page) => {
	const type = page.params.piece
	const slug = page.params.slug
	if (!config.pieces.some((piece) => piece.type === type)) error(404, 'Unknown piece type')

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
	const tags = await db
		.selectFrom('web_pieces_tags')
		.select(['slug', 'tag'])
		.distinct()
		.where('piece_id', '=', piece.id)
		.execute()

	const ogAsset = piece.assets.find((a) => a.transformation === 'opengraph')?.asset_path

	return {
		piece,
		tags,
		presentation: await renderPreparedPiecePage({ piece, tags, url: page.url }),
		meta: {
			title: `${piece.title} | ${config.content.text.title}`,
			type: piece.type,
			description: piece.summary,
			image: assetPathToUrl(ogAsset, config.url.luzzle_assets || config.url.app)
		}
	}
}
