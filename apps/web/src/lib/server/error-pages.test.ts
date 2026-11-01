import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { RequestEvent } from '@sveltejs/kit'
import type { HandleServerError } from '@sveltejs/kit/hooks'
import { makeConfig } from './config.fixture.js'
import { createErrorHandler } from './error-pages.js'

const fixture = vi.hoisted(() => ({ building: false, loadPageMarkdown: vi.fn() }))
vi.mock('$app/env', () => ({
	get building() {
		return fixture.building
	}
}))
vi.mock('$app/manifest', () => ({
	routes: [
		{ id: '/(root)', page: true, endpoint: false },
		{ id: '/search', page: true, endpoint: true },
		{ id: '/api/health', page: false, endpoint: true },
		{ id: '/(auth)/api/admin/publish', page: false, endpoint: true }
	]
}))
vi.mock('#lib/server/pages.js', () => ({ loadPageMarkdown: fixture.loadPageMarkdown }))

function configuration() {
	const config = makeConfig()
	config.paths.config = '/private/site/config.yaml'
	config.pages.error = {
		'404': { body: 'errors/not-found.md', home: false },
		'4xx': { body: 'errors/client.md', home: true },
		'500': { body: 'errors/server.md', home: true }
	}
	return config
}

type RequestOptions = {
	routeId?: string | null
	accept?: string | null
	method?: string
	isDataRequest?: boolean
	isSubRequest?: boolean
	isRemoteRequest?: boolean
	action?: boolean
}

function request({
	routeId = '/(root)',
	accept = 'text/html',
	method = 'GET',
	isDataRequest = false,
	isSubRequest = false,
	isRemoteRequest = false,
	action = false
}: RequestOptions = {}): RequestEvent {
	const headers = new Headers()
	if (accept !== null) headers.set('accept', accept)
	if (action) headers.set('x-sveltekit-action', 'true')
	return {
		url: new URL('https://garden.test/missing'),
		route: { id: routeId },
		request: new Request('https://garden.test/missing', { headers, method }),
		isDataRequest,
		isSubRequest,
		isRemoteRequest
	} as RequestEvent
}

function failure(status: number, event = request(), kind: 'app' | 'framework' = 'app') {
	return { kind, error: { status, message: 'Safe native message' }, event }
}

beforeEach(() => {
	vi.clearAllMocks()
	fixture.building = false
	fixture.loadPageMarkdown.mockResolvedValue('<h1>Authored error</h1>')
	vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

test('creating the native hook does not read any configured Markdown', () => {
	createErrorHandler(configuration())
	expect(fixture.loadPageMarkdown).not.toHaveBeenCalled()
})

test.each([
	[404, 'errors/not-found.md', false],
	[400, 'errors/client.md', true],
	[403, 'errors/client.md', true],
	[410, 'errors/client.md', true],
	[499, 'errors/client.md', true],
	[500, 'errors/server.md', true],
	[503, 'errors/server.md', true],
	[599, 'errors/server.md', true]
] as const)(
	'status %s selects only %s without overriding native status/message',
	async (status, body, home) => {
		const config = configuration()
		const handleError = createErrorHandler(config)
		const input = failure(status)
		const result = await handleError(input)
		expect(result).toEqual({ presentation: { html: '<h1>Authored error</h1>', home } })
		expect(fixture.loadPageMarkdown).toHaveBeenCalledExactlyOnceWith(body, config.paths.config)
		expect(input.error).toEqual({ status, message: 'Safe native message' })
		expect(console.error).not.toHaveBeenCalled()
	}
)

test('unmatched framework 404 uses the distinct not-found body', async () => {
	const result = await createErrorHandler(configuration())(
		failure(404, request({ routeId: null }), 'framework')
	)
	expect(result).toMatchObject({ presentation: { home: false } })
	expect(fixture.loadPageMarkdown).toHaveBeenCalledExactlyOnceWith(
		'errors/not-found.md',
		'/private/site/config.yaml'
	)
})

test.each([
	{ routeId: '/api/health', accept: 'application/json' },
	{ routeId: '/api/health', accept: 'text/html' },
	{ routeId: '/(auth)/api/admin/publish', accept: 'text/html' },
	{ routeId: '/(auth)/api/admin/publish', isDataRequest: true },
	{ accept: 'application/json' },
	{ accept: 'application/json, text/html' },
	{ accept: 'text/html;q=0.2, application/json;q=0.9' },
	{ routeId: null, accept: 'application/json' },
	{ isSubRequest: true },
	{ isRemoteRequest: true },
	{ action: true },
	{ method: 'POST', accept: null },
	{ method: 'POST', accept: '*/*' },
	{ method: 'POST', accept: 'application/json' }
])('leaves non-page/error JSON or internal requests untouched: %j', async (options) => {
	expect(await createErrorHandler(configuration())(failure(404, request(options)))).toBeUndefined()
	expect(fixture.loadPageMarkdown).not.toHaveBeenCalled()
})

test.each([
	{ isDataRequest: true, accept: 'application/json' },
	{ accept: 'application/json;q=0.2, text/html;q=0.9' },
	{ routeId: '/search', accept: 'text/html' },
	{ accept: null },
	{ method: 'POST', accept: 'text/html' }
])('server-backed page requests receive selected content: %j', async (options) => {
	expect(await createErrorHandler(configuration())(failure(403, request(options)))).toMatchObject({
		presentation: { html: '<h1>Authored error</h1>' }
	})
	expect(fixture.loadPageMarkdown).toHaveBeenCalledExactlyOnceWith(
		'errors/client.md',
		'/private/site/config.yaml'
	)
})

test('unknown errors keep private diagnostics server-side and native safe defaults intact', async () => {
	const error = new Error('private exception /deployment/secret.yaml')
	const result = await createErrorHandler(configuration())({
		kind: 'unknown',
		error,
		event: request()
	})
	expect(result).toEqual({ presentation: { html: '<h1>Authored error</h1>', home: true } })
	expect(JSON.stringify(result)).not.toMatch(/secret|private|status|message|stack/)
	expect(console.error).toHaveBeenCalledExactlyOnceWith(error)
	expect(fixture.loadPageMarkdown).toHaveBeenCalledExactlyOnceWith(
		'errors/server.md',
		'/private/site/config.yaml'
	)
})

test('native remote validation is logged without loading error content', async () => {
	const input: Parameters<HandleServerError>[0] = {
		kind: 'validation',
		error: { status: 400, message: 'Bad Request' },
		issues: [],
		event: request()
	}
	expect(await createErrorHandler(configuration())(input)).toBeUndefined()
	expect(fixture.loadPageMarkdown).not.toHaveBeenCalled()
	expect(console.error).toHaveBeenCalledWith('Remote function schema validation failed:', [])
})

test('building and omitted defaults do not read or attach error presentation', async () => {
	fixture.building = true
	expect(await createErrorHandler(configuration())(failure(404))).toBeUndefined()
	fixture.building = false
	expect(await createErrorHandler(makeConfig())(failure(404))).toBeUndefined()
	expect(fixture.loadPageMarkdown).not.toHaveBeenCalled()
})

test('home control is independent of Markdown and requires no file', async () => {
	const config = configuration()
	config.pages.error['404'] = { home: false }
	expect(await createErrorHandler(config)(failure(404))).toEqual({ presentation: { home: false } })
	expect(fixture.loadPageMarkdown).not.toHaveBeenCalled()
})

test.each([false, true])(
	'unreadable Markdown retains built-in copy and home=%s without leaking its path',
	async (home) => {
		const config = configuration()
		config.pages.error['404'].home = home
		fixture.loadPageMarkdown.mockRejectedValueOnce(
			new Error('Cannot read /private/site/errors/not-found.md')
		)
		const result = await createErrorHandler(config)(failure(404))
		expect(result).toEqual({ presentation: { home } })
		expect(JSON.stringify(result)).not.toMatch(/private|not-found|html|stack/)
		expect(console.error).toHaveBeenCalledExactlyOnceWith(
			'Unable to load configured error Markdown; using the built-in page.'
		)
	}
)

test('a synchronous path-resolution failure also falls back without throwing', async () => {
	fixture.loadPageMarkdown.mockImplementationOnce(() => {
		throw new Error('Missing config path')
	})
	await expect(createErrorHandler(configuration())(failure(404))).resolves.toEqual({
		presentation: { home: false }
	})
})

test('an explicitly empty Markdown body is still the selected presentation', async () => {
	fixture.loadPageMarkdown.mockResolvedValueOnce('')
	expect(await createErrorHandler(configuration())(failure(404))).toEqual({
		presentation: { html: '', home: false }
	})
})
