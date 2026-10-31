import { beforeEach, expect, test, vi } from 'vitest'
import { config } from '#lib/server/config.js'
import { credentialsAuth, oidcAuth } from '#lib/server/config.fixture.js'
import { GET } from './+server'

vi.mock('#lib/server/config.js', async () => {
	const { makeConfig } = await import('#lib/server/config.fixture.js')
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
	expect(response.headers.get('Cache-Control')).toBe('private, no-store')
	expect(request.locals.auth).not.toHaveBeenCalled()
})

test('public-only sites deny proxy authorization without authentication locals', async () => {
	config.auth = undefined
	const response = await GET({ locals: {} } as Parameters<typeof GET>[0])
	expect(response.status).toBe(401)
	expect(response.headers.get('Cache-Control')).toBe('private, no-store')
})

test('configured auth denies proxy authorization without a session accessor', async () => {
	const response = await GET({ locals: {} } as Parameters<typeof GET>[0])
	expect(response.status).toBe(401)
	expect(response.headers.get('Cache-Control')).toBe('private, no-store')
})

test.each([credentialsAuth, oidcAuth])('configured auth requires a session', async (auth) => {
	config.auth = auth
	const denied = await GET(event(null))
	expect(denied.status).toBe(401)
	expect(denied.headers.get('Cache-Control')).toBe('private, no-store')
	const response = await GET(event({ user: { name: 'admin' } }))
	expect(response.status).toBe(200)
	expect(response.headers.get('Content-Type')).toBe('application/json')
	expect(response.headers.get('Cache-Control')).toBe('private, no-store')
	expect(await response.json()).toEqual({ status: 'ok' })
})
