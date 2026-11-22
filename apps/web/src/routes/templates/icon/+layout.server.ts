import { redirect } from '@sveltejs/kit'
import { loadPieceListing } from '#lib/server/load/pieces.js'
import { config } from '#lib/server/config.js'
import { listingIconPlacement } from '#lib/pieces/listing-icon-placement.js'
import { loadPublishedIcon } from '#lib/server/templates/icon.js'
import type { LayoutServerLoadEvent } from './$types'

export const load = async (event: LayoutServerLoadEvent) => {
	const { params, url } = event
	// Rerouting retains the public URL; direct visits must use the canonical listing.
	if (decodeURI(url.pathname).startsWith('/templates/icon/')) {
		redirect(307, `/pieces/${encodeURIComponent(params.piece ?? '')}${url.search}`)
	}
	const listing = await loadPieceListing(event)
	const design = params.piece && (await loadPublishedIcon(params.piece, config))
	if (!design) return { ...listing, externalIcons: undefined }

	const html = listing.pieces.map((piece, index) => {
		try {
			return design.render(piece, listingIconPlacement(index))
		} catch (cause) {
			console.error(`Cannot render listing icon for ${piece.type}/${piece.slug}`, cause)
			return null // Keep the built-in icon and link for this piece.
		}
	})
	return { ...listing, externalIcons: { css: design.css, html } }
}
