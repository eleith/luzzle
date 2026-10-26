import { afterEach, expect, test, vi } from 'vitest'
import type { TemplateConfig } from '@luzzle/web.templates/config'
import { createServerEnvironment } from './runtime-environment.js'

type RuntimeConfig = Pick<TemplateConfig, 'network' | 'url' | 'auth'>
const auth: NonNullable<RuntimeConfig['auth']> = {
	secret: 'private-session-secret',
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

test('returns a fresh environment without mutating config, metadata or the supplied environment', () => {
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
		ORIGIN: 'https://configured.example',
		AUTH_URL: 'https://configured.example'
	})
	expect(environment).toEqual({ HOST: 'old-host', UNRELATED: 'keep' })
	expect(configured.url).toEqual({
		app: 'https://configured.example/garden/?page=2#top',
		app_assets: '/assets',
		luzzle_assets: '/pieces'
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
	['http://example.com', 'http://example.com'],
	['https://[::1]:443/', 'https://[::1]']
])('derives a canonical origin from app URL %s', (app, expected) => {
	const result = createServerEnvironment(config(app, true), {})
	expect(result.ORIGIN).toBe(expected)
	expect(result.AUTH_URL).toBe(expected)
})

test.each(['', '/', '/garden/', 'garden', './garden', '../garden', '//example.com/garden'])(
	'leaves relative or empty app URL %s request-derived',
	(app) => {
		const result = createServerEnvironment(config(app, true), {})
		expect(result).not.toHaveProperty('ORIGIN')
		expect(result).not.toHaveProperty('AUTH_URL')
	}
)

test.each([
	['https://Override.EXAMPLE:443/', 'https://override.example'],
	['http://override.example:80', 'http://override.example'],
	['https://override.example:8443/', 'https://override.example:8443']
])('explicit ORIGIN %s wins over a mismatched configured URL', (ORIGIN, expected) => {
	const environment = { ORIGIN }
	const result = createServerEnvironment(config(undefined, true), environment)
	expect(result.ORIGIN).toBe(expected)
	expect(result.AUTH_URL).toBe(expected)
	expect(environment.ORIGIN).toBe(ORIGIN)
})

test('an empty explicit ORIGIN opts out of canonical derivation and automatic AUTH_URL', () => {
	const result = createServerEnvironment(config(undefined, true), { ORIGIN: '' })
	expect(result.ORIGIN).toBe('')
	expect(result).not.toHaveProperty('AUTH_URL')
})

test('explicit origin mode works with relative configured URLs without deriving a fallback', () => {
	for (const ORIGIN of ['', 'https://override.example']) {
		expect(createServerEnvironment(config('/garden', true), { ORIGIN }).ORIGIN).toBe(ORIGIN)
	}
})

test('unsafe absolute app URLs are rejected even with an explicit ORIGIN', () => {
	for (const ORIGIN of ['', 'https://override.example']) {
		expect(() =>
			createServerEnvironment(config('https://user:private-password@example.com'), { ORIGIN })
		).toThrow(new Error('Invalid url.app: expected an HTTP(S) URL without credentials'))
	}
})

test.each([
	'https://example.com/garden',
	'https://example.com/.',
	'https://example.com/garden/..',
	'https://example.com//',
	'https://example.com?',
	'https://example.com#',
	'https://example.com/?secret=private-token',
	'https://example.com/#private-token',
	'https://user:private-password@example.com',
	'https://@example.com',
	'ftp://example.com',
	'javascript:private-token',
	'/garden',
	'//example.com',
	'https:example.com',
	'https:/example.com',
	'https:///example.com',
	'https://',
	'https://[invalid',
	'https://example.com:invalid',
	'https://example.com:65536',
	'https://example.com\\garden',
	'https://example.com\n',
	' https://example.com',
	' '
])('rejects invalid explicit ORIGIN without including its value: %s', (ORIGIN) => {
	try {
		createServerEnvironment(config(undefined, true), { ORIGIN })
		expect.fail('Expected ORIGIN validation to fail')
	} catch (error) {
		expect(error).toBeInstanceOf(Error)
		expect([
			'Invalid ORIGIN: expected an HTTP(S) URL without credentials',
			'Invalid ORIGIN: expected an HTTP(S) origin without path, query or fragment'
		]).toContain((error as Error).message)
		expect((error as Error).message).not.toContain(auth.secret)
	}
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
])('rejects unsafe absolute app URLs with field-only errors: %s', (app) => {
	for (const authenticated of [true, false]) {
		expect(() => createServerEnvironment(config(app, authenticated), {})).toThrow(
			new Error('Invalid url.app: expected an HTTP(S) URL without credentials')
		)
	}
})

test.each([
	{ AUTH_URL: 'https://auth.example/custom/path' },
	{ AUTH_URL: '' },
	{ AUTH_URL: 'not-a-url' },
	{ NEXTAUTH_URL: 'https://legacy.example/custom/path' },
	{ NEXTAUTH_URL: '' },
	{ NEXTAUTH_URL: 'not-a-url' },
	{ AUTH_URL: '', NEXTAUTH_URL: '' },
	{ AUTH_URL: 'https://auth.example', NEXTAUTH_URL: 'https://legacy.example' }
])('preserves explicit modern and legacy auth URL settings: %j', (environment) => {
	for (const authenticated of [true, false]) {
		for (const ORIGIN of [undefined, '', 'https://override.example']) {
			const result = createServerEnvironment(config(undefined, authenticated), {
				...environment,
				ORIGIN
			})
			expect(result.AUTH_URL).toBe(environment.AUTH_URL)
			expect(result.NEXTAUTH_URL).toBe(environment.NEXTAUTH_URL)
			expect(result.ORIGIN).toBe(ORIGIN ?? 'https://configured.example')
		}
	}
})

test('does not automatically set AUTH_URL when authentication is disabled', () => {
	const result = createServerEnvironment(config(), {})
	expect(result.ORIGIN).toBe('https://configured.example')
	expect(result).not.toHaveProperty('AUTH_URL')
	expect(result).not.toHaveProperty('NEXTAUTH_URL')
})

test('defaults to process.env without changing it', () => {
	vi.stubEnv('ORIGIN', 'https://process.example:443/')
	vi.stubEnv('AUTH_URL', undefined)
	vi.stubEnv('NEXTAUTH_URL', undefined)
	vi.stubEnv('HOST', 'existing-host')
	const before = { ...process.env }
	const result = createServerEnvironment(config(undefined, true))
	expect(result.ORIGIN).toBe('https://process.example')
	expect(result.AUTH_URL).toBe('https://process.example')
	expect(result.HOST).toBe('127.0.0.1')
	expect(process.env).toEqual(before)
})
