export function localRedirect(value: string | null, origin: string): string {
	const fallback = '/admin'
	if (!value) return fallback

	try {
		const url = new URL(value, origin)
		if (
			(url.protocol !== 'http:' && url.protocol !== 'https:') ||
			url.origin !== origin ||
			url.pathname.startsWith('//')
		)
			return fallback
		return url.pathname + url.search + url.hash
	} catch {
		return fallback
	}
}
