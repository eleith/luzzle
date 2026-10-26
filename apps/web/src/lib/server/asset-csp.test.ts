import { expect, test, vi } from 'vitest'
import type { Handle } from '@sveltejs/kit'
import { createAssetCspHandle } from './asset-csp'

const policy = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-hashes' 'sha256-fixed' 'nonce-framework'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data:",
	"connect-src 'self'",
	"font-src 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	"frame-ancestors 'none'"
].join('; ')

function htmlResponse(csp = policy) {
	return new Response('<html><body>unchanged</body></html>', {
		status: 201,
		statusText: 'Created',
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'content-security-policy': csp,
			'content-security-policy-report-only': "default-src 'none'",
			'cache-control': 'private, no-store',
			etag: '"original"'
		}
	})
}

async function apply(handle: Handle, response: Response) {
	return handle({
		event: {} as Parameters<Handle>[0]['event'],
		resolve: vi.fn().mockResolvedValue(response)
	})
}

function directives(response: Response) {
	return Object.fromEntries(
		(response.headers.get('content-security-policy') ?? '').split(';').map((part) => {
			const [name, ...sources] = part.trim().split(/\s+/)
			return [name, sources]
		})
	)
}

test('adds runtime prefixes to existing source lists while preserving framework authorization', async () => {
	const handle = createAssetCspHandle({
		app_assets: 'https://App.Example.test:443/public',
		luzzle_assets: 'https://pieces.example.test/media/'
	})
	const response = await apply(handle, htmlResponse())
	const csp = directives(response)
	for (const name of ['script-src', 'style-src', 'font-src', 'img-src'])
		expect(csp[name]).toContain('https://app.example.test/public/')
	expect(csp['img-src']).toContain('https://pieces.example.test/media/')
	for (const name of ['script-src', 'style-src', 'font-src'])
		expect(csp[name]).not.toContain('https://pieces.example.test/media/')
	expect(csp['script-src']).toEqual([
		"'self'",
		"'unsafe-hashes'",
		"'sha256-fixed'",
		"'nonce-framework'",
		'https://app.example.test/public/'
	])
	for (const name of ['default-src', 'connect-src', 'base-uri'])
		expect(csp[name]).toEqual(["'self'"])
	for (const name of ['object-src', 'frame-ancestors']) expect(csp[name]).toEqual(["'none'"])
	expect(csp['style-src']).toContain("'unsafe-inline'")
	expect(csp['img-src']).toContain('data:')
	expect(response.headers.get('content-security-policy-report-only')).toBe("default-src 'none'")
	expect(response.headers.get('cache-control')).toBe('private, no-store')
	expect(response.headers.get('etag')).toBe('"original"')
	expect(response.status).toBe(201)
	expect(response.statusText).toBe('Created')
	expect(await response.text()).toBe('<html><body>unchanged</body></html>')
})

test.each(['', '/local/assets', 'relative/assets'])(
	'same-origin prefix %s needs no external allowance',
	async (app_assets) => {
		const handle = createAssetCspHandle({ app_assets, luzzle_assets: '' })
		const response = htmlResponse()
		expect(await apply(handle, response)).toBe(response)
		expect(response.headers.get('content-security-policy')).toBe(policy)
	}
)

test('the piece CDN is image-only and does not widen script/style/font policy', async () => {
	const handle = createAssetCspHandle({
		app_assets: '',
		luzzle_assets: 'https://pieces.test/files'
	})
	const response = await apply(handle, htmlResponse())
	const csp = directives(response)
	expect(csp['img-src']).toContain('https://pieces.test/files/')
	for (const name of ['script-src', 'style-src', 'font-src'])
		expect(csp[name].join(' ')).not.toContain('pieces.test')
})

test('does not repeat shared or already-present sources', async () => {
	const source = 'https://shared.test/prefix/'
	const handle = createAssetCspHandle({ app_assets: source, luzzle_assets: source })
	const first = await apply(handle, htmlResponse())
	expect(directives(first)['img-src'].filter((value) => value === source)).toHaveLength(1)
	expect(await apply(handle, first)).toBe(first)
})

test('does not mutate immutable-style upstream headers or lose multiple cookies', async () => {
	const handle = createAssetCspHandle({
		app_assets: 'https://assets.test',
		luzzle_assets: ''
	})
	const original = htmlResponse()
	original.headers.append('set-cookie', 'session=one; Path=/; HttpOnly')
	original.headers.append('set-cookie', 'preference=dark; Path=/')
	const cookies = original.headers.getSetCookie()
	const mutation = vi.spyOn(original.headers, 'set').mockImplementation(() => {
		throw new TypeError('immutable')
	})
	const response = await apply(handle, original)
	expect(mutation).not.toHaveBeenCalled()
	expect(original.headers.get('content-security-policy')).toBe(policy)
	expect(response.headers.getSetCookie()).toEqual(cookies)
	expect(response.body).toBe(original.body)
})

test('leaves responses without generated policy, redirects and non-HTML responses alone', async () => {
	const handle = createAssetCspHandle({
		app_assets: 'https://assets.test',
		luzzle_assets: ''
	})
	for (const response of [
		new Response('<html>custom</html>', { headers: { 'content-type': 'text/html' } }),
		Response.redirect('https://app.test/signin'),
		new Response('{"ok":true}', {
			headers: { 'content-type': 'application/json', 'content-security-policy': policy }
		})
	])
		expect(await apply(handle, response)).toBe(response)
})

test.each([
	'https://user:private@assets.test',
	'https://@assets.test',
	'https://*',
	'https://*.example.test',
	'https://%2A',
	'https://%2a.example.test',
	'https://assets.test?token=private',
	'https://assets.test#fragment',
	'https://assets.test/;script-src',
	'https://assets.test/,other',
	'https://assets.test/"quoted"',
	'https://assets.test/ white',
	'https://assets.test/\nline',
	'https:\\assets.test',
	'//assets.test/path',
	'javascript:alert(1)',
	'data:image/png,bytes',
	'ftp://assets.test',
	'https:/assets.test',
	'https:///assets.test',
	'https://assets.test:65536',
	'/local?private=token',
	'https://'
])('rejects unsafe prefix %j at preparation without echoing its value', (value) => {
	for (const field of ['app_assets', 'luzzle_assets'] as const) {
		const urls = { app_assets: '', luzzle_assets: '', [field]: value }
		let failure: unknown
		try {
			createAssetCspHandle(urls)
		} catch (error) {
			failure = error
		}
		expect(failure).toBeInstanceOf(Error)
		expect((failure as Error).message).toContain(`url.${field}`)
		expect((failure as Error).message).not.toContain(value)
	}
})

test.each([
	[`${policy}, ${policy}`, 'single generated CSP policy'],
	[`${policy}; script-src https://duplicate.test`, 'unique generated CSP directives'],
	["default-src 'self'", 'script-src'],
	[
		policy.replace(
			"script-src 'self' 'unsafe-hashes' 'sha256-fixed' 'nonce-framework'",
			"script-src 'none'"
		),
		'script-src'
	]
])('refuses an unexpected generated policy instead of weakening it', async (csp, message) => {
	const handle = createAssetCspHandle({
		app_assets: 'https://assets.test',
		luzzle_assets: ''
	})
	await expect(apply(handle, htmlResponse(csp))).rejects.toThrow(message)
})
