import { afterEach, expect, test, vi } from 'vitest'
import type { TemplateConfig } from '@luzzle/web.templates/config'
import { createServerEnvironment, resolveAuthUrl } from './runtime-environment.js'

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
		ORIGIN: 'https://configured.example'
	})
	expect(environment).toEqual({ HOST: 'old-host', UNRELATED: 'keep' })
	expect(configured.url.app).toBe('https://configured.example/garden/?page=2#top')
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
])('Kit and auth derive the same canonical origin from %s', (app, expected) => {
	expect(createServerEnvironment(config(app, true), {}).ORIGIN).toBe(expected)
	expect(resolveAuthUrl(app)).toBe(expected)
})

test('ambient URL variables cannot replace the configured public URL', () => {
	vi.stubEnv('ORIGIN', 'https://unexpected.example')
	vi.stubEnv('BETTER_AUTH_URL', 'not-a-url')
	vi.stubEnv('AUTH_URL', 'https://legacy.example')
	vi.stubEnv('NEXTAUTH_URL', '')
	const before = { ...process.env }
	expect(createServerEnvironment(config(undefined, true)).ORIGIN).toBe('https://configured.example')
	expect(resolveAuthUrl('https://configured.example/garden')).toBe('https://configured.example')
	expect(process.env).toEqual(before)
})

test.each(['', '/', '/garden/', 'garden', './garden', '../garden', '//example.com/garden'])(
	'public-only relative app URL %s leaves Kit request-derived, ignoring ambient ORIGIN',
	(app) => {
		const result = createServerEnvironment(config(app), { ORIGIN: 'https://unexpected.example' })
		expect(result).not.toHaveProperty('ORIGIN')
		expect(() => resolveAuthUrl(app)).toThrow('Authentication requires an absolute url.app')
		expect(() => createServerEnvironment(config(app, true), {})).toThrow(
			'Authentication requires an absolute url.app'
		)
	}
)

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
