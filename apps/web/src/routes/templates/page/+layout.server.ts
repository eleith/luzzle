import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = ({ params, url }) => {
	// Rerouted requests retain the public URL. Don't expose alternate canonical URLs.
	if (decodeURI(url.pathname).startsWith('/templates/page/')) {
		redirect(
			307,
			`/pieces/${encodeURIComponent(params.piece ?? '')}/${encodeURIComponent(params.slug ?? '')}${url.search}`
		)
	}
}
