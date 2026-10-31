import { afterEach, expect, test, vi } from 'vitest'
import type { TemplateConfig } from '@luzzle/web.templates/config'
import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import {
	createServerEnvironment,
	installRequestOrigin,
	resolveAppOrigin,
	resolveAuthUrl
} from './runtime-environment.js'

type RuntimeConfig = Pick<TemplateConfig, 'network' | 'url' | 'auth'>
const auth: NonNullable<RuntimeConfig['auth']> = {
	secret: 'private-session-secret-with-at-least-32-characters',
	credentials: { username: 'admin', password: 'private-password' }
}

function config(app = 'https://configured.example/garden', authenticated = false): RuntimeConfig {
	const configured: RuntimeConfig = {
		network: {
			public: { host: '127.0.0.1' },
			internal: {
				explorer: 'http://explorer:3000',
				lsp: 'http://lsp:9001',
				worker: 'http://worker:9000'
			}
		},
		url: { app, app_assets: '/assets', luzzle_assets: '/pieces' }
	}
	if (authenticated) configured.auth = auth
	return configured
}

afterEach(() => vi.unstubAllEnvs())

test('returns a fresh environment without mutating config or supplied environment', () => {
	const configured = config('https://configured.example/garden/?page=2#top', true)
	Object.freeze(configured.url)
	Object.freeze(configured.network.public)
	Object.freeze(configured.network)
	Object.freeze(configured)
	const environment = Object.freeze({ HOST: 'old-host', UNRELATED: 'keep' })
	const result = createServerEnvironment(configured, environment)
	expect(result).not.toBe(environment)
	expect(result).toEqual({
		HOST: '127.0.0.1',
		UNRELATED: 'keep',
		PROTOCOL_HEADER: 'x-luzzle-public-protocol',
		HOST_HEADER: 'x-luzzle-public-authority',
		PORT_HEADER: ''
	})
	expect(environment).toEqual({ HOST: 'old-host', UNRELATED: 'keep' })
	expect(configured.url.app).toBe('https://configured.example/garden/?page=2#top')
})

test('absolute YAML replaces ambient header selection without putting the authority in the environment', () => {
	const result = createServerEnvironment(config('https://configured.example:8443/garden'), {
		ORIGIN: 'https://unexpected.example',
		PROTOCOL_HEADER: 'x-forwarded-proto',
		HOST_HEADER: 'x-forwarded-host',
		PORT_HEADER: 'x-forwarded-port'
	})
	expect(result).toEqual({
		HOST: '127.0.0.1',
		PROTOCOL_HEADER: 'x-luzzle-public-protocol',
		HOST_HEADER: 'x-luzzle-public-authority',
		PORT_HEADER: ''
	})
})

test('falls back to the existing public bind host when the configured host is empty', () => {
	const configured = config()
	configured.network.public.host = ''
	expect(createServerEnvironment(configured, { HOST: 'ignored' }).HOST).toBe('0.0.0.0')
})

test.each([
	['https://Example.COM:443/', 'https://example.com'],
	['http://Example.COM:80/garden', 'http://example.com'],
	['https://example.com:8443/garden/', 'https://example.com:8443'],
	['http://localhost:8080', 'http://localhost:8080'],
	['https://[::1]:443/', 'https://[::1]']
])('request boundary and auth derive the same canonical origin from %s', (app, expected) => {
	expect(resolveAppOrigin(app)).toBe(expected)
	expect(resolveAuthUrl(app)).toBe(expected)
	expect(createServerEnvironment(config(app, true), {})).toEqual({
		HOST: '127.0.0.1',
		PROTOCOL_HEADER: 'x-luzzle-public-protocol',
		HOST_HEADER: 'x-luzzle-public-authority',
		PORT_HEADER: ''
	})
})

test('ambient URL variables cannot replace the configured public URL', () => {
	vi.stubEnv('ORIGIN', 'https://unexpected.example')
	vi.stubEnv('BETTER_AUTH_URL', 'not-a-url')
	vi.stubEnv('AUTH_URL', 'https://legacy.example')
	vi.stubEnv('NEXTAUTH_URL', '')
	const before = { ...process.env }
	expect(createServerEnvironment(config(undefined, true))).toMatchObject({
		PROTOCOL_HEADER: 'x-luzzle-public-protocol',
		HOST_HEADER: 'x-luzzle-public-authority',
		PORT_HEADER: ''
	})
	expect(createServerEnvironment(config(undefined, true))).not.toHaveProperty('ORIGIN')
	expect(resolveAuthUrl('https://configured.example/garden')).toBe('https://configured.example')
	expect(process.env).toEqual(before)
})

test.each(['', '/', '/garden/', 'garden', './garden', '../garden', '//example.com/garden'])(
	'public-only relative app URL %s leaves Kit request-derived, ignoring ambient ORIGIN',
	(app) => {
		const result = createServerEnvironment(config(app), {
			ORIGIN: 'https://unexpected.example',
			PROTOCOL_HEADER: 'x-forwarded-proto',
			HOST_HEADER: 'x-forwarded-host',
			PORT_HEADER: 'x-forwarded-port'
		})
		expect(result).toEqual({
			HOST: '127.0.0.1',
			PROTOCOL_HEADER: 'x-forwarded-proto',
			HOST_HEADER: 'x-forwarded-host',
			PORT_HEADER: 'x-forwarded-port'
		})
		expect(resolveAppOrigin(app)).toBeUndefined()
		expect(() => resolveAuthUrl(app)).toThrow('Authentication requires an absolute url.app')
		expect(() => createServerEnvironment(config(app, true), {})).toThrow(
			'Authentication requires an absolute url.app'
		)
	}
)

test('relative public mode does not introduce header settings when none were supplied', () => {
	expect(
		createServerEnvironment(config('/garden'), { ORIGIN: 'https://unexpected.example' })
	).toEqual({
		HOST: '127.0.0.1'
	})
})

test('origin listener precedes the native listener on the first and later requests, replacing only internal headers', () => {
	const received: Record<string, unknown>[] = []
	const nativeListener = vi.fn((request: IncomingMessage) => {
		received.push({ method: request.method, url: request.url, headers: { ...request.headers } })
	})
	const server = createServer(nativeListener)
	installRequestOrigin(server, resolveAppOrigin('https://Configured.EXAMPLE:8443/garden'))
	expect(server.listeners('request')[1]).toBe(nativeListener)

	for (const origin of ['https://configured.example:8443', 'https://browser.example']) {
		const request = new IncomingMessage(new Socket())
		request.method = 'POST'
		request.url = '/garden/action?next=%2Fprivate&tag=a&tag=b'
		request.headers = {
			host: 'internal.example:3000',
			origin,
			cookie: 'session=unchanged',
			'content-type': 'application/x-www-form-urlencoded',
			'x-forwarded-proto': 'http',
			'x-forwarded-host': 'spoofed.example:9999',
			'x-forwarded-port': '9999',
			'x-luzzle-public-protocol': 'http',
			'x-luzzle-public-authority': 'spoofed.example:9999'
		}
		const original = { ...request.headers }
		server.emit('request', request, new ServerResponse(request))
		expect(received.at(-1)).toEqual({
			method: 'POST',
			url: '/garden/action?next=%2Fprivate&tag=a&tag=b',
			headers: {
				...original,
				'x-luzzle-public-protocol': 'https',
				'x-luzzle-public-authority': 'configured.example:8443'
			}
		})
		request.destroy()
	}
	expect(nativeListener).toHaveBeenCalledTimes(2)
})

test('relative public origin leaves the native request listener and headers untouched', () => {
	const nativeListener = vi.fn()
	const server = createServer(nativeListener)
	installRequestOrigin(server, resolveAppOrigin('/garden'))
	expect(server.listeners('request')).toEqual([nativeListener])
	const request = new IncomingMessage(new Socket())
	request.headers = { host: 'native.example', 'x-forwarded-proto': 'https' }
	server.emit('request', request, new ServerResponse(request))
	expect(request.headers).toEqual({ host: 'native.example', 'x-forwarded-proto': 'https' })
	expect(nativeListener).toHaveBeenCalledOnce()
	request.destroy()
})

test.each([
	'ftp://example.com/private-token',
	'ws://example.com',
	'file:///private-token',
	'javascript:private-token',
	'data:text/plain,private-token',
	'https://user:private-password@example.com/garden',
	'https://@example.com',
	'https:example.com',
	'https:/example.com',
	'https:///example.com',
	'https://',
	'http://[invalid',
	'https://example.com:invalid',
	'https://example.com:65536',
	'https://example.com\\private-token',
	' https://example.com',
	'ht\ntps://example.com',
	'\u0000https://example.com'
])('rejects unsafe configured URLs with field-only errors: %s', (app) => {
	const invalid = new Error('Invalid url.app: expected an HTTP(S) URL without credentials')
	for (const authenticated of [true, false]) {
		expect(() => createServerEnvironment(config(app, authenticated), {})).toThrow(invalid)
	}
	expect(() => resolveAuthUrl(app)).toThrow(invalid)
})
