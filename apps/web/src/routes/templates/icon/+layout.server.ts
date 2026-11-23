import { redirect } from '@sveltejs/kit'
import { loadPieceListing } from '#lib/server/load/pieces.js'
import { config } from '#lib/server/config.js'
import { renderIconListing } from '#lib/pieces/icon-listing/render.server.js'
import type { LayoutServerLoadEvent } from './$types'

export const load = async (event: LayoutServerLoadEvent) => {
	const { params, url } = event
	// Rerouting retains the public URL; direct visits must use the canonical listing.
	if (decodeURI(url.pathname).startsWith('/templates/icon/')) {
		redirect(307, `/pieces/${encodeURIComponent(params.piece ?? '')}${url.search}`)
	}
	const listing = await loadPieceListing(event)
	return { ...listing, externalIcons: await renderIconListing(listing.pieces, config) }
}
