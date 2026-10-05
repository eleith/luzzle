import { beforeEach, expect, test, vi } from 'vitest'
import { load } from './+page.server'

const { config } = vi.hoisted(() => ({
	config: {
		auth: {
			enabled: true,
			type: 'credentials' as 'credentials' | 'oidc',
			oidc: { name: 'Single Sign-On' }
		}
	}
}))
vi.mock('$lib/server/config', () => ({ config }))

beforeEach(() => {
	config.auth.enabled = true
	config.auth.type = 'credentials'
})

function event(session: object | null) {
	return {
		locals: { auth: vi.fn().mockResolvedValue(session) },
		url: new URL('http://localhost/signin')
	} as unknown as Parameters<typeof load>[0]
}

test('public-only signin redirects before accessing missing Auth.js locals', async () => {
	config.auth.enabled = false
	await expect(load({ locals: {} } as Parameters<typeof load>[0])).rejects.toMatchObject({
		status: 302,
		location: '/'
	})
})

test.each(['credentials', 'oidc'] as const)(
	'keeps %s signin available when enabled',
	async (type) => {
		config.auth.type = type
		expect(await load(event(null))).toEqual({ authType: type, oidcName: 'Single Sign-On' })
	}
)

test('authenticated signin redirects to the admin page', async () => {
	await expect(load(event({ user: { name: 'admin' } }))).rejects.toMatchObject({
		status: 302,
		location: '/admin'
	})
})
