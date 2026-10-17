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

function event(session: object | null, redirectTo?: string) {
	const url = new URL('http://localhost/signin')
	if (redirectTo !== undefined) url.searchParams.set('redirectTo', redirectTo)
	return {
		locals: { auth: vi.fn().mockResolvedValue(session) },
		url
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
	expect(await load(event(null))).toEqual({
		authType: 'credentials',
		oidcName: undefined,
		redirectTo: '/admin'
	})
})

test('OIDC signin exposes its display name but no provider secrets', async () => {
	config.auth = oidcAuth
	expect(await load(event(null))).toEqual({
		authType: 'oidc',
		oidcName: 'Single Sign-On',
		redirectTo: '/admin'
	})
})

const destinations = [
	{ value: undefined, expected: '/admin' },
	{ value: '', expected: '/admin' },
	{
		value: '/garden/admin/piece/books/%E6%BA%90%20%23%3F%25.md/source?tag=a%26b&filter=a+b#title',
		expected: '/garden/admin/piece/books/%E6%BA%90%20%23%3F%25.md/source?tag=a%26b&filter=a+b#title'
	},
	{ value: 'http://localhost/admin/publish?page=2', expected: '/admin/publish?page=2' },
	{ value: 'https://external.example', expected: '/admin' },
	{ value: '//external.example', expected: '/admin' },
	{ value: '/\\\\external.example', expected: '/admin' },
	{ value: 'http://localhost//external.example', expected: '/admin' },
	{ value: 'javascript:alert(1)', expected: '/admin' },
	{ value: 'blob:http://localhost/admin', expected: '/admin' },
	{ value: 'https://[invalid', expected: '/admin' }
]

test.each(
	[
		{ authType: 'credentials', auth: credentialsAuth },
		{ authType: 'oidc', auth: oidcAuth }
	].flatMap((provider) => destinations.map((destination) => ({ ...provider, ...destination })))
)(
	'$authType signin shares the validated destination $expected for redirectTo=$value',
	async ({ auth, value, expected }) => {
		config.auth = auth
		// Both client signin flows receive only the normalized server value.
		expect(await load(event(null, value))).toMatchObject({ redirectTo: expected })
		await expect(load(event({ user: { name: 'admin' } }, value))).rejects.toMatchObject({
			status: 302,
			location: expected
		})
	}
)
