export function encodeArchivePath(path: string): string {
	return path.split('/').map(encodeURIComponent).join('/')
}

export function editorHref(file: string): string {
	return `/admin/piece/${encodeArchivePath(file)}/source`
}

export function isPiecesPath(pathname: string): boolean {
	const [, prefix] = pathname.split('/', 2)
	try {
		return decodeURIComponent(prefix ?? '') === 'pieces'
	} catch {
		return false
	}
}

export function publicPieceHref({ type, slug }: { type: string; slug: string }): string {
	return `/pieces/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`
}

export function publicPageUrl(appUrl: string, origin: string, publicPath: string): string {
	const url = new URL(appUrl || '/', origin)
	url.pathname = `${url.pathname.replace(/\/+$/, '')}${publicPath}`
	url.search = ''
	url.hash = ''
	return url.href
}

export function publishedHref(file: string): string {
	return `/admin/view/published/${encodeArchivePath(file)}`
}

export function publishQuery(file: string): URLSearchParams {
	return new URLSearchParams({ check: '1', file })
}

export function publishHref(file: string): string {
	return `/admin/publish?${publishQuery(file)}`
}

export function previewHref(job: string): string {
	return `/admin/view/preview/${encodeURIComponent(job)}`
}
