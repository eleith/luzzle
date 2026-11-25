import { withPieceTemplates } from '#lib/pieces/assets.server.js'
import { config } from '#lib/server/config.js'
import { loadPublicPiece } from '#lib/server/load/piece.js'
import { renderAuthoredPage } from '#lib/server/templates/page.js'
import type { PageServerLoad } from './$types'

export const load = (async (event) => {
	const detail = await loadPublicPiece(event)
	const renderedPage = await renderAuthoredPage(detail.piece, detail.tags, config)
	if (!renderedPage) {
		return { ...detail, piece: withPieceTemplates(detail.piece), renderedPage: null }
	}
	const { type, slug } = detail.piece
	return { piece: { type, slug }, meta: detail.meta, renderedPage }
}) satisfies PageServerLoad
