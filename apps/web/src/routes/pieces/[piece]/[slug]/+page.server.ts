import { config } from '#lib/server/config.js'
import { loadPublicPiece } from '#lib/server/load/piece.js'
import { renderPublishedPage } from '#lib/server/templates/page.js'
import type { PageServerLoad } from './$types'

export const load = (async (event) => {
	const detail = await loadPublicPiece(event)
	const renderedPage = await renderPublishedPage(detail.piece, detail.tags, config)
	const { type, slug } = detail.piece
	return { piece: { type, slug }, meta: detail.meta, renderedPage }
}) satisfies PageServerLoad
