import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { db } from '$lib/server/database'
import { config } from '$lib/server/config'
import { processMarkdown } from '$lib/server/markdown'
import { hydrateWithAssets } from '$lib/pieces/assets.server'

export const load: PageServerLoad = async (page) => {
	const type = page.params.piece
	const slug = page.params.slug

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

	const metadata = JSON.parse(piece.json_metadata || '{}') as Record<string, unknown>
	const note = piece.note ? await processMarkdown(piece.note) : null
	const ogAsset = piece.assets.find((a) => a.transformation === 'opengraph')?.asset_path

	return {
		piece,
		tags,
		metadata,
		html_note: note,
		meta: {
			title: `${piece.title} | ${config.content.text.title}`,
			type: piece.type,
			description: piece.summary,
			image: ogAsset ? `${config.url.luzzle_assets}/pieces/assets/${ogAsset}` : undefined
		}
	}
}
