import { config } from '#lib/server/config.js'
import { renderPieceIcons } from '#lib/pieces/icon-listing/render.server.js'
import { loadPieceListing } from '#lib/server/load/pieces.js'
import type { PageServerLoad } from './$types'

export const load = (async (event) => {
	const listing = await loadPieceListing(event)
	const rows = listing.pieces.map((piece, index) => ({
		piece,
		size: { width: 125 },
		lazy: index >= 5
	}))
	const externalIcons = await renderPieceIcons(rows, config)
	return { ...listing, externalIcons }
}) satisfies PageServerLoad
