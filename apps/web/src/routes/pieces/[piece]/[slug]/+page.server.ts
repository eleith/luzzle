import { config } from '#lib/server/config.js'
import { loadPublicPiece } from '#lib/server/load/piece.js'
import { renderAuthoredPage } from '#lib/server/templates/page.js'
import type { PageServerLoad } from './$types'

export const load = (async (event) => {
	const detail = await loadPublicPiece(event)
	const renderedPage = await renderAuthoredPage(detail.piece, detail.tags, config)
	const { type, slug } = detail.piece
	if (!renderedPage) throw new Error(`No page template file configured for ${type}`)
	return { piece: { type, slug }, meta: detail.meta, renderedPage }
}) satisfies PageServerLoad
