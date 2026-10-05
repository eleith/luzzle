import { beforeEach, expect, test, vi } from 'vitest'
import { config } from '$lib/server/config'
import { credentialsAuth, oidcAuth } from '$lib/server/config.fixture'
import { GET } from './+server'

vi.mock('$lib/server/config', async () => {
	const { makeConfig } = await import('$lib/server/config.fixture')
	return { config: makeConfig() }
})

beforeEach(() => {
	config.auth = credentialsAuth
})

function event(session: object | null) {
	return { locals: { auth: vi.fn().mockResolvedValue(session) } } as unknown as Parameters<
		typeof GET
	>[0]
}

test('public-only sites deny proxy authorization even if a session exists', async () => {
	config.auth = undefined
	const request = event({ user: { name: 'admin' } })
	const response = await GET(request)
	expect(response.status).toBe(401)
	expect(request.locals.auth).not.toHaveBeenCalled()
})

test('public-only sites deny proxy authorization without Auth.js locals', async () => {
	config.auth = undefined
	const response = await GET({ locals: {} } as Parameters<typeof GET>[0])
	expect(response.status).toBe(401)
})

test.each([credentialsAuth, oidcAuth])('configured auth requires a session', async (auth) => {
	config.auth = auth
	expect((await GET(event(null))).status).toBe(401)
	const response = await GET(event({ user: { name: 'admin' } }))
	expect(response.status).toBe(200)
	expect(await response.json()).toEqual({ status: 'ok' })
})
