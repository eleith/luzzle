import { beforeEach, expect, test, vi } from 'vitest'
import { GET } from './+server'

const { config } = vi.hoisted(() => ({ config: { auth: { enabled: true } } }))
vi.mock('$lib/server/config', () => ({ config }))

beforeEach(() => {
	config.auth.enabled = true
})

function event(session: object | null) {
	return { locals: { auth: vi.fn().mockResolvedValue(session) } } as unknown as Parameters<
		typeof GET
	>[0]
}

test('public-only sites deny proxy authorization even if a session exists', async () => {
	config.auth.enabled = false
	const request = event({ user: { name: 'admin' } })
	const response = await GET(request)
	expect(response.status).toBe(401)
	expect(request.locals.auth).not.toHaveBeenCalled()
})

test('public-only sites deny proxy authorization without Auth.js locals', async () => {
	config.auth.enabled = false
	const response = await GET({ locals: {} } as Parameters<typeof GET>[0])
	expect(response.status).toBe(401)
})

test('enabled auth denies a missing session', async () => {
	expect((await GET(event(null))).status).toBe(401)
})

test('enabled auth permits an authenticated proxy request', async () => {
	const response = await GET(event({ user: { name: 'admin' } }))
	expect(response.status).toBe(200)
	expect(await response.json()).toEqual({ status: 'ok' })
})
