import { createHash } from 'node:crypto'
import { describe, expect, test, vi } from 'vitest'
import { createSiteAssetHandler } from './responses.js'

const bytes = new TextEncoder().encode('selected bytes with café\0')
const asset = { bytes, contentType: 'application/octet-stream' }
const etag = `"${createHash('sha256').update(bytes).digest('base64url')}"`
const successHeaders = {
	'content-type': asset.contentType,
	'content-length': String(bytes.byteLength),
	'cache-control': 'public, max-age=0, must-revalidate',
	'x-content-type-options': 'nosniff',
	etag
}

function request(method = 'GET', headers: HeadersInit = {}) {
	return new Request('https://garden.test/assets/selected?file=/private/other', {
		method,
		headers
	})
}

describe('site asset HTTP responses', () => {
	test.each(['GET', 'HEAD'])('%s serves bytes with revalidation metadata', async (method) => {
		const serve = createSiteAssetHandler(async () => asset)
		const response = await serve(request(method))
		expect(response.status).toBe(200)
		expect(Object.fromEntries(response.headers)).toEqual(successHeaders)
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(
			method === 'HEAD' ? new Uint8Array() : bytes
		)
		if (method === 'HEAD') expect(response.body).toBeNull()
	})

	test.each([
		['strong', etag],
		['weak', `W/${etag}`],
		['list', `"old", W/${etag}, "older"`],
		['whitespace', `  "old" ,  ${etag}  `],
		['wildcard', '*']
	])('returns bodyless GET/HEAD 304s for a current %s validator', async (_, validator) => {
		const serve = createSiteAssetHandler(async () => asset)
		for (const method of ['GET', 'HEAD']) {
			const response = await serve(request(method, { 'if-none-match': validator }))
			expect(response.status).toBe(304)
			expect(response.body).toBeNull()
			expect(await response.text()).toBe('')
			expect(Object.fromEntries(response.headers)).toEqual({
				'content-type': asset.contentType,
				'cache-control': successHeaders['cache-control'],
				'x-content-type-options': 'nosniff',
				etag
			})
		}
	})

	test.each(['"old"', 'W/"old"', '"old", "older"', ''])(
		'returns a full response for a stale or empty validator %j',
		async (validator) => {
			const serve = createSiteAssetHandler(async () => asset)
			for (const method of ['GET', 'HEAD']) {
				const response = await serve(request(method, { 'if-none-match': validator }))
				expect(response.status).toBe(200)
				expect(Object.fromEntries(response.headers)).toEqual(successHeaders)
				expect(new Uint8Array(await response.arrayBuffer())).toEqual(
					method === 'HEAD' ? new Uint8Array() : bytes
				)
			}
		}
	)

	test.each(['GET', 'HEAD'])(
		'%s ignores ranges, encoding preferences, and request source hints',
		async (method) => {
			const load = vi.fn(async () => asset)
			const response = await createSiteAssetHandler(load)(
				request(method, {
					range: 'bytes=0-1',
					'if-range': etag,
					'accept-encoding': 'br, gzip',
					'x-image-source': '/private/other.png',
					'x-font-source': '/private/other.woff2'
				})
			)
			expect(load).toHaveBeenCalledExactlyOnceWith()
			expect(response.status).toBe(200)
			// No content-encoding, content-range, or accept-ranges is advertised.
			expect(Object.fromEntries(response.headers)).toEqual(successHeaders)
			expect(new Uint8Array(await response.arrayBuffer())).toEqual(
				method === 'HEAD' ? new Uint8Array() : bytes
			)
		}
	)

	test.each(['GET', 'HEAD'])('%s returns a safe, uncached 404 for no asset', async (method) => {
		const serve = createSiteAssetHandler(async () => undefined)
		const response = await serve(request(method, { 'if-none-match': '*', range: 'bytes=0-1' }))
		expect(response.status).toBe(404)
		expect(Object.fromEntries(response.headers)).toEqual({
			'content-type': 'text/plain; charset=utf-8',
			'content-length': '9',
			'cache-control': 'no-store',
			'x-content-type-options': 'nosniff'
		})
		expect(await response.text()).toBe(method === 'HEAD' ? '' : 'Not found')
		if (method === 'HEAD') expect(response.body).toBeNull()
	})
})

test('rereads changed bytes and updates their headers on the next request', async () => {
	const load = vi.fn(async () => asset)
	const serve = createSiteAssetHandler(load)
	const first = await serve(request())
	expect(first.headers.get('etag')).toBe(etag)

	const changed = new TextEncoder().encode('changed bytes')
	load.mockResolvedValue({ bytes: changed, contentType: asset.contentType })
	const response = await serve(request('GET', { 'if-none-match': etag }))
	expect(response.status).toBe(200)
	expect(response.headers.get('etag')).not.toBe(etag)
	expect(response.headers.get('content-length')).toBe(String(changed.byteLength))
	expect(await response.text()).toBe('changed bytes')
	expect(load).toHaveBeenCalledTimes(2)
})

test('retries an unavailable configured file on the next request', async () => {
	const load = vi.fn(async (): Promise<typeof asset | undefined> => undefined)
	const serve = createSiteAssetHandler(load)
	expect((await serve(request())).status).toBe(404)
	load.mockResolvedValue(asset)
	expect((await serve(request())).status).toBe(200)
	expect(load).toHaveBeenCalledTimes(2)
})
