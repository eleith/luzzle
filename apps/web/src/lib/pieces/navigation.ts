export function getPieceLinks(url: URL, routeId: string) {
	const current = new URL(url)
	current.pathname = current.pathname.replace(/\/$/, '')
	const published = new URL(routeId.endsWith('/published') ? 'published/' : './', current)

	return {
		source: new URL('../source', published).pathname,
		overview: published.pathname.replace(/\/$/, ''),
		page: new URL('page', published).pathname,
		icon: new URL('icon', published).pathname,
		share: new URL('share', published).pathname
	}
}

export type PieceLinks = ReturnType<typeof getPieceLinks>
