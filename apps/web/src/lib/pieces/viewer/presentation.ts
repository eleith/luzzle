export function transformFamily(name: string) {
	const separator = name.indexOf('.')
	return separator > 0 ? name.slice(0, separator) : name
}

export function transformCaption(name: string) {
	return name.charAt(0).toUpperCase() + name.slice(1)
}

function normalizedMime(mime: string) {
	return mime.split(';')[0].trim().toLowerCase()
}

export function fileType(mime?: string) {
	const type = normalizedMime(mime ?? '')
	const known: Record<string, string> = {
		'image/jpeg': 'JPEG',
		'image/png': 'PNG',
		'image/webp': 'WebP',
		'image/avif': 'AVIF',
		'image/svg+xml': 'SVG',
		'application/pdf': 'PDF',
		'application/zip': 'ZIP',
		'text/html': 'HTML',
		'application/json': 'JSON',
		'text/plain': 'Text',
		'text/markdown': 'Markdown',
		'application/octet-stream': 'Binary'
	}
	return Object.hasOwn(known, type)
		? known[type]
		: /^[a-z0-9][a-z0-9.+-]*\/([a-z0-9][a-z0-9.+-]{0,23})$/.exec(type)?.[1] || 'File'
}
