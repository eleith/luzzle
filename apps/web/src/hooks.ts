import { LUZZLE_PAGE_TEMPLATES as pageTemplates } from '$app/env/public'
import type { Reroute } from '@sveltejs/kit/hooks'

export const reroute: Reroute = ({ url }) => {
	const match = /^\/pieces\/([^/]+)\/([^/]+)\/?$/.exec(url.pathname)
	if (!match) return
	const [, encodedType, encodedSlug] = match

	let type: string
	try {
		type = decodeURIComponent(encodedType)
	} catch {
		return // Let Kit handle malformed URLs.
	}

	if (type !== 'assets' && Object.hasOwn(pageTemplates, type)) {
		return `/templates/page/${pageTemplates[type]}/${encodedType}/${encodedSlug}`
	}
}
