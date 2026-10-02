import { afterEach, expect, test, vi } from 'vitest'
import type { Handle } from '@sveltejs/kit'

const fixture = vi.hoisted(() => ({
	config: {
		auth: { enabled: true, type: 'credentials', secret: 'test-secret' },
		url: { app_assets: '' }
	}
}))
vi.mock('$lib/server/config', () => ({ config: fixture.config }))
vi.mock('$lib/server/database', () => ({}))
// Exercise the application guard, not Auth.js or SvelteKit's request-store machinery.
vi.mock('@sveltejs/kit/hooks', () => ({ sequence: (_auth: Handle, guard: Handle) => guard }))
vi.mock('@auth/sveltekit', () => ({
	SvelteKitAuth: () => ({
		handle: (({ event, resolve }) => resolve(event)) satisfies Handle
	})
}))

afterEach(() => {
	fixture.config.auth.enabled = true
	vi.resetModules()
})

function event(session: object | null) {
	return {
		url: new URL('http://localhost/api/admin/generate'),
		locals: { auth: vi.fn().mockResolvedValue(session) }
	} as unknown as Parameters<Handle>[0]['event']
}

test('the generation namespace requires a session before resolving its handler', async () => {
	const { handle } = await import('./hooks.server')
	const resolve = vi.fn()
	await expect(handle({ event: event(null), resolve })).rejects.toMatchObject({
		status: 302,
		location: '/signin?redirectTo=/api/admin/generate'
	})
	expect(resolve).not.toHaveBeenCalled()
})

test('generation remains inaccessible when admin authentication is disabled', async () => {
	fixture.config.auth.enabled = false
	const { handle } = await import('./hooks.server')
	const resolve = vi.fn()
	await expect(handle({ event: event({ user: { name: 'test' } }), resolve })).rejects.toMatchObject(
		{
			status: 302,
			location: '/'
		}
	)
	expect(resolve).not.toHaveBeenCalled()
})

test('an authenticated generation request reaches its handler', async () => {
	const { handle } = await import('./hooks.server')
	const response = new Response('resolved')
	const resolve = vi.fn().mockResolvedValue(response)
	await expect(handle({ event: event({ user: { name: 'test' } }), resolve })).resolves.toBe(
		response
	)
})
