import { beforeEach, expect, test, vi } from 'vitest'
import { config } from '$lib/server/config'
import { credentialsAuth, oidcAuth } from '$lib/server/config.fixture'
import { load } from './+page.server'

vi.mock('$lib/server/config', async () => {
	const { makeConfig } = await import('$lib/server/config.fixture')
	return { config: makeConfig() }
})

beforeEach(() => {
	config.auth = credentialsAuth
})

function event(session: object | null) {
	return {
		locals: { auth: vi.fn().mockResolvedValue(session) },
		url: new URL('http://localhost/signin')
	} as unknown as Parameters<typeof load>[0]
}

test('public-only signin redirects before accessing missing Auth.js locals', async () => {
	config.auth = undefined
	await expect(load({ locals: {} } as Parameters<typeof load>[0])).rejects.toMatchObject({
		status: 302,
		location: '/'
	})
})

test('credentials signin projects only the selected provider', async () => {
	expect(await load(event(null))).toEqual({ authType: 'credentials', oidcName: undefined })
})

test('OIDC signin exposes its display name but no provider secrets', async () => {
	config.auth = oidcAuth
	expect(await load(event(null))).toEqual({ authType: 'oidc', oidcName: 'Single Sign-On' })
})

test('authenticated signin redirects to the admin page', async () => {
	await expect(load(event({ user: { name: 'admin' } }))).rejects.toMatchObject({
		status: 302,
		location: '/admin'
	})
})
