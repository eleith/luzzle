import {
	LUZZLE_PAGE_TEMPLATES as pageTemplates,
	LUZZLE_ICON_TEMPLATES as iconTemplates
} from '$app/env/public'
import { isPiecesPath } from '#lib/pieces/navigation.js'
import type { Reroute } from '@sveltejs/kit/hooks'

export const reroute: Reroute = ({ url }) => {
	if (!isPiecesPath(url.pathname)) return
	const match = /^\/[^/]+\/([^/]+)(?:\/([^/]+))?\/?$/.exec(url.pathname)
	if (!match) return
	const [, encodedType, encodedSlug] = match

	let type: string
	try {
		type = decodeURIComponent(encodedType)
	} catch {
		return // Let Kit handle malformed URLs.
	}

	if (type === 'assets') return
	if (encodedSlug) {
		if (Object.hasOwn(pageTemplates, type)) {
			return `/templates/page/${pageTemplates[type]}/${encodedType}/${encodedSlug}`
		}
	} else if (Object.hasOwn(iconTemplates, type)) {
		return `/templates/icon/${iconTemplates[type]}/${encodedType}`
	}
}
