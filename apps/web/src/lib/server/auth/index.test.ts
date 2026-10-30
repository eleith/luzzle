import { afterAll, afterEach, beforeEach, expect, test, vi } from 'vitest'
import { validateConfig } from '@luzzle/web.config'
import { parseSetCookieHeader } from 'better-auth/cookies'
import { credentialsAuth, oidcAuth } from '$lib/server/config.fixture'
import { createAuth, createSessionReader } from './index'

// Exercise production rate limiting and origin checks, not the library's test defaults.
vi.hoisted(() => vi.stubEnv('NODE_ENV', 'production'))

const origin = 'https://luzzle.example.test'
const credentials = credentialsAuth.credentials
let auth: NonNullable<ReturnType<typeof createAuth>>
let client = 0
let address: string

beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'production')
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date('2026-10-29T12:00:00Z'))
	address = `192.0.2.${++client}`
	auth = createAuth(credentialsAuth, origin)!
})
afterEach(() => {
	vi.restoreAllMocks()
	vi.useRealTimers()
	vi.unstubAllGlobals()
	vi.unstubAllEnvs()
})
afterAll(() => vi.unstubAllEnvs())

function request(path: string, body?: unknown, headers: Record<string, string> = {}) {
	let method = 'GET'
	let requestBody: string | undefined
	if (body !== undefined) {
		method = 'POST'
		requestBody = JSON.stringify(body)
	}
	return auth.handler(
		new Request(new URL(`/api/auth${path}`, origin), {
			method,
			headers: { origin, 'content-type': 'application/json', 'x-real-ip': address, ...headers },
			body: requestBody
		})
	)
}

function cookies(response: Response) {
	return [...parseSetCookieHeader(response.headers.get('set-cookie') ?? '')]
		.filter(([, attributes]) => attributes.value)
		.map(([name, attributes]) => `${name}=${attributes.value}`)
		.join('; ')
}

function appSession(cookie: string) {
	return createSessionReader(auth, new Headers({ cookie }))()
}

test('public-only mode needs neither a secret nor a valid auth URL', async () => {
	expect(createAuth(undefined, '')).toBeUndefined()
	const read = createSessionReader(undefined, new Headers())
	const first = read()
	expect(read()).toBe(first)
	expect(await first).toBeNull()
})

test('auth initialization rejects resolved secrets shorter than 32 characters', () => {
	expect(() => createAuth({ ...credentialsAuth, secret: 'x'.repeat(31) }, origin)).toThrow(
		'auth.secret must contain at least 32 characters after environment interpolation.'
	)
})

test('32-character resolved secrets are accepted after interpolating a shorter placeholder', async () => {
	const secret = '0123456789abcdefABCDEFGHIJKLMNOP'
	const config = validateConfig(
		{ auth: { ...credentialsAuth, secret: '${TEST_AUTH_SECRET}' } },
		{ TEST_AUTH_SECRET: secret }
	)
	auth = createAuth(config.auth, origin)!
	expect((await auth.$context).secret).toBe(secret)
	expect((await request('/sign-in/credentials', credentials)).status).toBe(200)
})

test('an environment keyring cannot replace YAML secrets or keep cookies valid after rotation', async () => {
	vi.stubEnv('BETTER_AUTH_SECRETS', '99:short')
	auth = createAuth(credentialsAuth, origin)!
	const context = await auth.$context
	expect(context.secret).toBe(credentialsAuth.secret)
	expect(context.secretConfig).toEqual({
		keys: new Map([[1, credentialsAuth.secret]]),
		currentVersion: 1,
		legacySecret: credentialsAuth.secret
	})
	const login = await request('/sign-in/credentials', credentials)
	expect(login.status).toBe(200)
	const cookie = cookies(login)
	const rotated = 'replacement-session-secret-with-at-least-32-characters'
	auth = createAuth({ ...credentialsAuth, secret: rotated }, origin)!
	expect((await auth.$context).secret).toBe(rotated)
	expect(await appSession(cookie)).toBeNull()
})

test('native log severity is retained without forwarding sensitive messages or arguments', () => {
	const error = vi.spyOn(console, 'error').mockImplementation(() => {})
	const info = vi.spyOn(console, 'info').mockImplementation(() => {})
	auth.options.logger?.log?.('error', 'sensitive native message', { token: 'private-token' })
	auth.options.logger?.log?.('info', 'another sensitive message')
	expect(error).toHaveBeenLastCalledWith('Authentication event', { source: 'better-auth' })
	expect(info).toHaveBeenLastCalledWith('Authentication event', { source: 'better-auth' })
})

test('native HTTP login validates YAML credentials and cookie-less first-login origin', async () => {
	const bad = await request('/sign-in/credentials', { ...credentials, password: 'wrong' })
	expect(bad.status).toBe(401)
	expect((await bad.json()).code).toBe('CredentialsSignin')
	expect(cookies(bad)).toBe('')

	const crossOrigin = await request('/sign-in/credentials', credentials, {
		origin: 'https://another.example.test'
	})
	expect(crossOrigin.status).toBe(403)
	expect(cookies(crossOrigin)).toBe('')

	const good = await request('/sign-in/credentials', credentials)
	expect(good.status).toBe(200)
	expect(await good.json()).toEqual({ success: true })
	expect(cookies(good)).toContain('session_data=')
	expect(cookies(good)).not.toContain(credentials.password)
	expect(cookies(good)).not.toContain('account_data=')
	expect(auth.options.database).toBeUndefined()
	expect(auth.options.secondaryStorage).toBeUndefined()
})

test('native auth endpoints accept a canonical URL with a trailing slash', async () => {
	auth = createAuth(credentialsAuth, `${origin}/`)!
	const login = await request('/sign-in/credentials', credentials)
	expect(login.status).toBe(200)
	expect((await request('/sign-out', {}, { cookie: cookies(login) })).status).toBe(200)
})

test('native throttling uses trusted X-Real-IP rather than a supplied forwarded-for list', async () => {
	for (let attempt = 0; attempt < 4; attempt++) {
		const response = await request(
			'/sign-in/credentials',
			{ ...credentials, password: 'wrong' },
			{ 'x-forwarded-for': `198.51.100.${attempt + 10}` }
		)
		expect(response.status).toBe(attempt < 3 ? 401 : 429)
	}
	address = `192.0.2.${++client}`
	expect((await request('/sign-in/credentials', credentials)).status).toBe(200)
})

test('the lazy app session reader memoizes and preserves fixed expiry across an auth restart', async () => {
	const login = await request('/sign-in/credentials', credentials)
	const cookie = cookies(login)
	auth = createAuth(credentialsAuth, origin)!
	const getSession = vi.spyOn(auth.api, 'getSession')
	const read = createSessionReader(auth, new Headers({ cookie }))
	expect(getSession).not.toHaveBeenCalled()
	const first = read()
	expect(read()).toBe(first)
	const session = await first
	expect(getSession).toHaveBeenCalledOnce()
	expect(session).toEqual({
		user: { name: credentials.username, email: `${credentials.username}@luzzle.local` },
		expires: '2026-11-05T12:00:00.000Z'
	})

	const damaged = cookie.replace(/(session_data=.{12})/, '$1x')
	expect(await appSession(damaged)).toBeNull()
	vi.setSystemTime(new Date('2026-11-04T12:00:00Z'))
	expect(await appSession(cookie)).toEqual(session)
	vi.setSystemTime(new Date('2026-11-05T12:00:01Z'))
	expect(await appSession(cookie)).toBeNull()
})

test('bypassing the cookie cache cannot renew the underlying session beyond seven days', async () => {
	const login = await request('/sign-in/credentials', credentials)
	const cookie = cookies(login)
	vi.setSystemTime(new Date('2026-10-31T12:00:00Z'))
	const response = await request('/get-session?disableCookieCache=true', undefined, { cookie })
	expect((await response.json()).session.expiresAt).toBe('2026-11-05T12:00:00.000Z')
	vi.setSystemTime(new Date('2026-11-05T12:00:01Z'))
	const expired = await request('/get-session?disableCookieCache=true', undefined, { cookie })
	expect(await expired.json()).toBeNull()
})

test('native logout clears browser cookies and unconfigured native strategies cannot create sessions', async () => {
	const login = await request('/sign-in/credentials', credentials)
	const logout = await request('/sign-out', {}, { cookie: cookies(login) })
	expect(logout.status).toBe(200)
	const cleared = parseSetCookieHeader(logout.headers.get('set-cookie') ?? '')
	const sessionCookies = [...cleared].filter(([name]) => name.includes('session_'))
	expect(sessionCookies.length).toBeGreaterThanOrEqual(2)
	for (const [, attributes] of sessionCookies) expect(attributes.value).toBe('')

	const signup = await request('/sign-up/email', {
		name: 'Someone',
		email: 'someone@example.test',
		password: 'another-password'
	})
	expect((await signup.json()).code).toBe('EMAIL_PASSWORD_SIGN_UP_DISABLED')
	expect(cookies(signup)).toBe('')
	const passwordLogin = await request('/sign-in/email', {
		email: `${credentials.username}@luzzle.local`,
		password: credentials.password
	})
	expect((await passwordLogin.json()).code).toBe('EMAIL_PASSWORD_DISABLED')
	expect(cookies(passwordLogin)).toBe('')
	const social = await request('/sign-in/social', { provider: 'oidc', callbackURL: '/admin' })
	expect(social.ok).toBe(false)
	expect(cookies(social)).not.toContain('session_data=')
})

test('OIDC discovery uses PKCE, verified-token configuration and the default callback namespace', async () => {
	const issuer = 'https://idp.example.test/tenant'
	const fetch = vi.fn(async (input: RequestInfo | URL) => {
		expect(String(input)).toBe(`${issuer}/.well-known/openid-configuration`)
		return Response.json({
			issuer,
			authorization_endpoint: `${issuer}/authorize`,
			token_endpoint: `${issuer}/token`,
			userinfo_endpoint: `${issuer}/userinfo`,
			jwks_uri: `${issuer}/jwks`,
			id_token_signing_alg_values_supported: ['RS256']
		})
	})
	vi.stubGlobal('fetch', fetch)
	auth = createAuth({ ...oidcAuth, oidc: { ...oidcAuth.oidc, issuer: `${issuer}/` } }, origin)!
	const response = await request('/sign-in/social', { provider: 'oidc', callbackURL: '/admin' })
	expect(response.status).toBe(200)
	expect(fetch).toHaveBeenCalledOnce()
	const authorization = new URL((await response.json()).url)
	expect(authorization.origin + authorization.pathname).toBe(`${issuer}/authorize`)
	expect(authorization.searchParams.get('redirect_uri')).toBe(`${origin}/api/auth/callback/oidc`)
	expect(authorization.searchParams.get('code_challenge_method')).toBe('S256')
	expect(authorization.searchParams.get('nonce')).toBeTruthy()
	expect(auth.options.plugins?.[0].options?.config[0]).toMatchObject({
		name: oidcAuth.oidc.name,
		clientId: oidcAuth.oidc.clientId,
		clientSecret: oidcAuth.oidc.clientSecret,
		requireIdTokenVerification: true,
		tokenEndpointAuth: { method: 'client_secret_basic' },
		disableProviderLogout: true
	})

	const failedCallback = await request('/callback/oidc?code=unmatched')
	expect(failedCallback.status).toBe(302)
	const location = new URL(failedCallback.headers.get('location')!, origin)
	expect(location.origin + location.pathname).toBe(`${origin}/signin`)
	expect(location.searchParams.getAll('error')).toHaveLength(1)
	expect(location.searchParams.get('error')).toBeTruthy()
	expect(cookies(failedCallback)).not.toContain('session_data=')
})
