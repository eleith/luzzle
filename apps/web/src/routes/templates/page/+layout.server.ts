import { redirect } from '@sveltejs/kit'
import { loadPiece } from '#lib/server/load/piece.js'
import type { LayoutServerLoadEvent } from './$types'

export const load = (event: LayoutServerLoadEvent) => {
	const { params, url } = event
	// Rerouted requests retain the public URL. Don't expose alternate canonical URLs.
	if (decodeURI(url.pathname).startsWith('/templates/page/')) {
		redirect(
			307,
			`/pieces/${encodeURIComponent(params.piece ?? '')}/${encodeURIComponent(params.slug ?? '')}${url.search}`
		)
	}
	return loadPiece(event)
}
