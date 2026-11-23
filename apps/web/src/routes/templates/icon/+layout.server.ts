import { redirect } from '@sveltejs/kit'
import { loadPieceListing } from '#lib/server/load/pieces.js'
import { config } from '#lib/server/config.js'
import { renderPieceIcons } from '#lib/pieces/icon-listing/render.server.js'
import type { LayoutServerLoadEvent } from './$types'

export const load = async (event: LayoutServerLoadEvent) => {
	const { params, url } = event
	// Rerouting retains the public URL; direct visits must use the canonical listing.
	if (decodeURI(url.pathname).startsWith('/templates/icon/')) {
		redirect(307, `/pieces/${encodeURIComponent(params.piece ?? '')}${url.search}`)
	}
	const listing = await loadPieceListing(event)
	const rows = listing.pieces.map((piece, index) => ({
		piece,
		size: { width: 125 },
		lazy: index >= 5
	}))
	const externalIcons = await renderPieceIcons(rows, config)
	return { ...listing, externalIcons }
}
