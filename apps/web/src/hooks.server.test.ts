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

function event(session: object | null, pathname = '/api/admin/generate') {
	return {
		url: new URL(`http://localhost${pathname}`),
		locals: { auth: vi.fn().mockResolvedValue(session) }
	} as unknown as Parameters<Handle>[0]['event']
}

test.each(['/admin', '/admin/pieces', '/api/admin/generate', '/admin/lsp', '/administrator'])(
	'the protected prefix %s requires a session before resolving its handler',
	async (pathname) => {
		const { handle } = await import('./hooks.server')
		const resolve = vi.fn()
		await expect(handle({ event: event(null, pathname), resolve })).rejects.toMatchObject({
			status: 302,
			location: `/signin?redirectTo=${pathname}`
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
	const request = event(null, '/')
	const response = new Response('public')
	const resolve = vi.fn().mockResolvedValue(response)
	await expect(handle({ event: request, resolve })).resolves.toBe(response)
	expect(request.locals.auth).not.toHaveBeenCalled()
	expect(fixture.createAuth).not.toHaveBeenCalled()
})

test('an authenticated generation request reaches its handler', async () => {
	const { handle } = await import('./hooks.server')
	const response = new Response('resolved')
	const resolve = vi.fn().mockResolvedValue(response)
	await expect(handle({ event: event({ user: { name: 'test' } }), resolve })).resolves.toBe(
		response
	)
})

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
