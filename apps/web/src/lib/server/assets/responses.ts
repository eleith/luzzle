import { createHash } from 'node:crypto'

interface SiteAsset {
	bytes: Uint8Array<ArrayBuffer>
	contentType: string
}

function matchesEtag(header: string | null, etag: string): boolean {
	if (!header) return false
	return (
		header.trim() === '*' ||
		header.split(',').some((tag) => tag.trim().replace(/^W\//, '') === etag)
	)
}

export function siteAssetNotFound(method: string): Response {
	return new Response(method === 'HEAD' ? null : 'Not found', {
		status: 404,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'content-length': '9',
			'cache-control': 'no-store',
			'x-content-type-options': 'nosniff'
		}
	})
}

export function createSiteAssetHandler(load: () => Promise<SiteAsset | undefined>) {
	return async (request: Request): Promise<Response> => {
		const asset = await load()
		if (!asset) return siteAssetNotFound(request.method)
		const etag = `"${createHash('sha256').update(asset.bytes).digest('base64url')}"`
		const headers = new Headers({
			'content-type': asset.contentType,
			'cache-control': 'public, max-age=0, must-revalidate',
			'x-content-type-options': 'nosniff',
			etag
		})
		if (matchesEtag(request.headers.get('if-none-match'), etag)) {
			return new Response(null, { status: 304, headers })
		}
		headers.set('content-length', String(asset.bytes.byteLength))
		return new Response(request.method === 'HEAD' ? null : asset.bytes, { headers })
	}
}
