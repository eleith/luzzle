import { config } from '#lib/server/config.js'
import { renderIconListing } from '#lib/pieces/icon-listing/render.server.js'
import { loadPieceListing } from '#lib/server/load/pieces.js'
import type { PageServerLoad } from './$types'

export const load = (async (event) => {
	const listing = await loadPieceListing(event)
	return { ...listing, externalIcons: await renderIconListing(listing.pieces, config) }
}) satisfies PageServerLoad
