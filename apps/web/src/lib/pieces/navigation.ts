export function encodeArchivePath(path: string): string {
	return path.split('/').map(encodeURIComponent).join('/')
}

export function editorHref(file: string): string {
	return `/admin/piece/${encodeArchivePath(file)}/source`
}

export function publishedHref(file: string): string {
	return `/admin/piece/${encodeArchivePath(file)}/published`
}

export function publishQuery(file: string): URLSearchParams {
	return new URLSearchParams({ check: '1', file })
}

export function publishHref(file: string): string {
	return `/admin/publish?${publishQuery(file)}`
}

export function previewHref(file: string, job?: string): string {
	const href = `/admin/piece/${encodeArchivePath(file)}/preview`
	return job === undefined ? href : `${href}/${encodeURIComponent(job)}`
}
