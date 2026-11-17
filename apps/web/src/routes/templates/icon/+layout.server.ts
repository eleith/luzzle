import { redirect } from '@sveltejs/kit'
import { loadPieceListing } from '#lib/server/load/pieces.js'
import type { LayoutServerLoadEvent } from './$types'

export const load = (event: LayoutServerLoadEvent) => {
	const { params, url } = event
	// Rerouting retains the public URL; direct visits must use the canonical listing.
	if (decodeURI(url.pathname).startsWith('/templates/icon/')) {
		redirect(307, `/pieces/${encodeURIComponent(params.piece ?? '')}${url.search}`)
	}
	return loadPieceListing(event)
}
