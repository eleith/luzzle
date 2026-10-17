import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { Handle } from '@sveltejs/kit'
import type { Config } from '@luzzle/web.config'
import { credentialsAuth, oidcAuth } from '$lib/server/config.fixture'

const fixture = vi.hoisted(() => ({
	config: {
		auth: undefined as Config['auth'],
		url: { app_assets: '' }
	},
	createAuth: vi.fn(() => ({
		handle: (({ event, resolve }) => resolve(event)) satisfies Handle
	}))
}))
vi.mock('$lib/server/config', () => ({ config: fixture.config }))
vi.mock('$lib/server/database', () => ({}))
// Exercise the application guard, not Auth.js or SvelteKit's request-store machinery.
vi.mock('@sveltejs/kit/hooks', () => ({ sequence: (_auth: Handle, guard: Handle) => guard }))
vi.mock('@auth/sveltekit', () => ({ SvelteKitAuth: fixture.createAuth }))

beforeEach(() => {
	fixture.config.auth = credentialsAuth
	vi.clearAllMocks()
})
afterEach(() => vi.resetModules())

function event(
	session: object | null,
	pathname = '/api/admin/generate',
	{
		routeId = `/(auth)${pathname}`,
		isDataRequest = false,
		method = 'GET',
		search = '',
		headers = { accept: 'text/html' }
	}: {
		routeId?: string | null
		isDataRequest?: boolean
		method?: string
		search?: string
		headers?: HeadersInit
	} = {}
) {
	return {
		url: new URL(`http://localhost${pathname}${search}`),
		request: new Request(
			`http://localhost${pathname}${isDataRequest ? '/__data.json' : ''}${search}`,
			{
				method,
				headers
			}
		),
		route: { id: routeId },
		isDataRequest,
		setHeaders: vi.fn(),
		locals: { auth: vi.fn().mockResolvedValue(session) }
	} as unknown as Parameters<Handle>[0]['event']
}

test.each(['/admin', '/admin/pieces', '/api/admin', '/api/admin/generate', '/admin/lsp'])(
	'the protected route %s requires a session before resolving its handler',
	async (pathname) => {
		const { handle } = await import('./hooks.server')
		const resolve = vi.fn()
		await expect(handle({ event: event(null, pathname), resolve })).rejects.toMatchObject({
			status: 302,
			location: `/signin?${new URLSearchParams({ redirectTo: pathname })}`
		})
		expect(resolve).not.toHaveBeenCalled()
	}
)

test.each(['/admin', '/admin/lsp', '/api/admin/generate'])(
	'%s remains inaccessible without configured auth, even with a session',
	async (pathname) => {
		fixture.config.auth = undefined
		const { handle } = await import('./hooks.server')
		const resolve = vi.fn()
		const request = event({ user: { name: 'test' } }, pathname)
		await expect(handle({ event: request, resolve })).rejects.toMatchObject({
			status: 302,
			location: '/'
		})
		expect(resolve).not.toHaveBeenCalled()
		expect(request.locals.auth).not.toHaveBeenCalled()
		expect(fixture.createAuth).not.toHaveBeenCalled()
	}
)

test('public-only requests resolve without constructing Auth.js or reading a session', async () => {
	fixture.config.auth = undefined
	const { handle } = await import('./hooks.server')
	const request = event(null, '/', { routeId: '/(root)' })
	const response = new Response('public', {
		headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }
	})
	const resolve = vi.fn().mockResolvedValue(response)
	await expect(handle({ event: request, resolve })).resolves.toBe(response)
	expect(request.locals.auth).not.toHaveBeenCalled()
	expect(request.setHeaders).not.toHaveBeenCalled()
	expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
	expect(fixture.createAuth).not.toHaveBeenCalled()
})

test.each([false, true])(
	'signin preserves an encoded path and its query as one return parameter (data=%s)',
	async (isDataRequest) => {
		const { handle } = await import('./hooks.server')
		const pathname = '/garden/%61dmin/piece/books/%E6%BA%90%20%23%3F%25.md/published'
		const search = '?tag=a%26b&filter=a+b&redirectTo=https%3A%2F%2Fexternal.example'
		const resolve = vi.fn()
		const request = event(null, pathname, {
			routeId: '/(auth)/admin/piece/[...path]/published',
			isDataRequest,
			search,
			headers: { accept: isDataRequest ? 'application/json' : 'text/html' }
		})
		const failure = await Promise.resolve(handle({ event: request, resolve })).catch(
			(error) => error
		)
		expect(failure).toMatchObject({ status: 302, location: expect.any(String) })
		const signin = new URL(failure.location, request.url.origin)
		expect(signin.pathname).toBe('/signin')
		expect([...signin.searchParams]).toEqual([['redirectTo', pathname + search]])
		expect(resolve).not.toHaveBeenCalled()
	}
)

test.each(['/admin', '/admin/preview/job/asset/private.png', '/api/admin/generate'])(
	'%s sets the framework cache policy before resolving protected content',
	async (pathname) => {
		const { handle } = await import('./hooks.server')
		const request = event({ user: { name: 'test' } }, pathname)
		const resolve = vi.fn(async () => {
			expect(request.setHeaders).toHaveBeenCalledExactlyOnceWith({
				'Cache-Control': 'private, no-store'
			})
			return new Response('private')
		})
		await handle({ event: request, resolve })
		expect(resolve).toHaveBeenCalledOnce()
	}
)

test('an authenticated generation request reaches its handler', async () => {
	const { handle } = await import('./hooks.server')
	const response = new Response('resolved')
	const resolve = vi.fn().mockResolvedValue(response)
	await expect(handle({ event: event({ user: { name: 'test' } }), resolve })).resolves.toBe(
		response
	)
})

const encodedRequests = [
	...['', '/page', '/icon', '/share'].flatMap((suffix) =>
		[false, true].map((isDataRequest) => ({
			pathname: '/%61dmin/piece/books/book.books.md/published' + suffix,
			routeId: '/(auth)/admin/piece/[...path]/published' + suffix,
			isDataRequest,
			method: 'GET'
		}))
	),
	{
		pathname: '/%61dmin/piece/books/book.books.md/source',
		routeId: '/(auth)/admin/piece/[...path]/source',
		method: 'POST'
	},
	{ pathname: '/%61pi/admin/generate', routeId: '/(auth)/api/admin/generate', method: 'POST' },
	{ pathname: '/api/%61dmin/publish', routeId: '/(auth)/api/admin/publish', method: 'POST' },
	{ pathname: '/garden/admin/pieces', routeId: '/(auth)/admin/pieces', method: 'GET' },
	{ pathname: '/public-alias', routeId: '/(auth)/admin/pieces', method: 'GET' },
	{ pathname: '/future-tool', routeId: '/(auth)/future-tool', method: 'GET' },
	{ pathname: '/', routeId: '/(auth)', method: 'GET' }
]

test.each(encodedRequests)(
	'$method $pathname (data=$isDataRequest) requires a session by matched route identity',
	async ({ pathname, ...options }) => {
		const { handle } = await import('./hooks.server')
		const resolve = vi.fn()
		const request = event(null, pathname, options)
		if (options.method === 'GET') {
			await expect(handle({ event: request, resolve })).rejects.toMatchObject({
				status: 302,
				location: `/signin?${new URLSearchParams({ redirectTo: pathname })}`
			})
		} else {
			const response = await handle({ event: request, resolve })
			expect(response.status).toBe(401)
			expect(response.headers.has('location')).toBe(false)
			expect(await response.json()).toEqual({ message: 'Unauthorized' })
		}
		expect(request.locals.auth).toHaveBeenCalledOnce()
		expect(resolve).not.toHaveBeenCalled()
	}
)

test.each(encodedRequests)(
	'$pathname remains inaccessible with auth disabled, even with a session (data=$isDataRequest)',
	async ({ pathname, ...options }) => {
		fixture.config.auth = undefined
		const { handle } = await import('./hooks.server')
		const resolve = vi.fn()
		const request = event({ user: { name: 'test' } }, pathname, options)
		if (options.method === 'GET') {
			await expect(handle({ event: request, resolve })).rejects.toMatchObject({
				status: 302,
				location: '/'
			})
		} else {
			const response = await handle({ event: request, resolve })
			expect(response.status).toBe(403)
			expect(response.headers.has('location')).toBe(false)
			expect(await response.json()).toEqual({ message: 'Forbidden' })
		}
		expect(request.locals.auth).not.toHaveBeenCalled()
		expect(resolve).not.toHaveBeenCalled()
	}
)

test.each(encodedRequests)(
	'authenticated $pathname resolves normally (data=$isDataRequest)',
	async ({ pathname, ...options }) => {
		const { handle } = await import('./hooks.server')
		const response = new Response('resolved')
		const resolve = vi.fn().mockResolvedValue(response)
		const request = event({ user: { name: 'test' } }, pathname, options)
		await expect(handle({ event: request, resolve })).resolves.toBe(response)
		expect(request.locals.auth).toHaveBeenCalledOnce()
		expect(resolve).toHaveBeenCalledExactlyOnceWith(request)
	}
)

test.each([
	{ pathname: '/administrator', routeId: '/administrator' },
	{ pathname: '/api/administer', routeId: '/api/administer' },
	{ pathname: '/admin-looking-alias', routeId: '/public' },
	{ pathname: '/', routeId: '/(root)' },
	{ pathname: '/signin', routeId: '/signin' },
	{ pathname: '/api/auth/verify', routeId: '/api/auth/verify' },
	{ pathname: '/authentication', routeId: '/(authentic)/authentication' },
	{ pathname: '/admin-looking-group', routeId: '/(auth)extra/admin' },
	{ pathname: '/admin/not-a-route', routeId: null }
])('public/unmatched $routeId is not classified by URL spelling', async ({ pathname, routeId }) => {
	const { handle } = await import('./hooks.server')
	const response = new Response('public or not found')
	const resolve = vi.fn().mockResolvedValue(response)
	const request = event(null, pathname, { routeId })
	await expect(handle({ event: request, resolve })).resolves.toBe(response)
	expect(request.locals.auth).not.toHaveBeenCalled()
	expect(resolve).toHaveBeenCalledExactlyOnceWith(request)
})

test.each([true, false])(
	'non-navigation requests get generic errors (auth=%s)',
	async (enabled) => {
		fixture.config.auth = enabled ? credentialsAuth : undefined
		const { handle } = await import('./hooks.server')
		for (const pathname of ['/admin/tools', '/api/admin/generate', '/future-tool']) {
			for (const [method, accept] of [
				['POST', 'application/json'],
				['GET', 'text/event-stream'],
				['GET', '*/*'],
				['DELETE', 'text/html'],
				['HEAD', 'text/html']
			]) {
				const request = event(null, pathname, { method, headers: { accept } })
				const resolve = vi.fn()
				const response = await handle({ event: request, resolve })
				expect(response.status).toBe(enabled ? 401 : 403)
				expect(response.headers.get('Cache-Control')).toBe('private, no-store')
				expect(response.headers.has('location')).toBe(false)
				expect(await response.json()).toEqual({ message: enabled ? 'Unauthorized' : 'Forbidden' })
				expect(resolve).not.toHaveBeenCalled()
				if (!enabled) expect(request.locals.auth).not.toHaveBeenCalled()
			}
		}
	}
)

test.each([true, false])(
	'enhanced forms keep their existing redirects (auth=%s)',
	async (enabled) => {
		fixture.config.auth = enabled ? credentialsAuth : undefined
		const { handle } = await import('./hooks.server')
		const pathname = '/admin/piece/books/book.books.md/source'
		const request = event(null, pathname, {
			method: 'POST',
			headers: { accept: 'application/json', 'x-sveltekit-action': 'true' }
		})
		const resolve = vi.fn()
		await expect(handle({ event: request, resolve })).rejects.toMatchObject({
			status: 302,
			location: enabled ? `/signin?${new URLSearchParams({ redirectTo: pathname })}` : '/'
		})
		expect(resolve).not.toHaveBeenCalled()
	}
)

test.each([
	{ auth: credentialsAuth, provider: 'credentials' },
	{ auth: oidcAuth, provider: 'oidc' }
])('installs only the configured $provider provider', async ({ auth, provider }) => {
	fixture.config.auth = auth
	await import('./hooks.server')
	expect(fixture.createAuth).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({
			secret: auth.secret,
			providers: [expect.objectContaining({ id: provider })]
		})
	)
})
