import { error } from '@sveltejs/kit'
import { db } from '#lib/server/database/index.js'
import { config } from '#lib/server/config.js'
import { hydratePublicPiece, withPieceTemplates } from '#lib/pieces/assets.server.js'
import { assetPathToUrl } from '@luzzle/web.pieces'
import { isConfiguredPieceType } from '#lib/pieces/types.server.js'

type PieceRequest = { params: { piece?: string; slug?: string } }

export const loadPublicPiece = async ({ params }: PieceRequest) => {
	const type = params.piece
	const slug = params.slug
	if (!type || !isConfiguredPieceType(type)) error(404, 'Unknown piece type')
	if (!slug) error(404, 'piece does not exist')

	const webPiece = await db
		.selectFrom('web_pieces')
		.selectAll()
		.where('type', '=', type)
		.where('slug', '=', slug)
		.executeTakeFirst()

	if (!webPiece) {
		return error(404, `piece does not exist`)
	}

	const piece = await hydratePublicPiece(webPiece)
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
		meta: {
			title: `${piece.title} | ${config.content.text.title}`,
			type: piece.type,
			description: piece.summary,
			image: assetPathToUrl(ogAsset, config.url.luzzle_assets || config.url.app)
		}
	}
}

export const loadPiece = async (event: PieceRequest) => {
	const detail = await loadPublicPiece(event)
	return { ...detail, piece: withPieceTemplates(detail.piece) }
}
