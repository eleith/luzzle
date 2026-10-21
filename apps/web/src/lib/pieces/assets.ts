export function encodeAssetPath(assetPath: string | null | undefined): string | undefined {
	if (
		!assetPath?.trim() ||
		assetPath.includes('\\') ||
		assetPath.includes('\0') ||
		/^[a-z][a-z\d+.-]*:/i.test(assetPath)
	) {
		return undefined
	}
	const segments = assetPath.split('/')
	if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
		return undefined
	}
	return segments.map(encodeURIComponent).join('/')
}

export function assetPathToUrl(
	assetPath: string | null | undefined,
	base: string
): string | undefined {
	const encoded = encodeAssetPath(assetPath)
	if (!encoded) return undefined
	return joinAssetUrl(`pieces/assets/${encoded}`, base)
}

export function staticAssetPathToUrl(
	relativePath: string | null | undefined,
	base: string
): string | undefined {
	const encoded = encodeAssetPath(relativePath)
	if (!encoded) return undefined
	return joinAssetUrl(encoded, base)
}

function joinAssetUrl(path: string, base: string): string {
	if (!base || base.startsWith('/')) {
		return `${base.replace(/\/+$/, '')}/${path}`
	}
	const url = new URL(base)
	url.pathname = `${url.pathname.replace(/\/+$/, '')}/${path}`
	url.search = ''
	url.hash = ''
	return url.href
}
