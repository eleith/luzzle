import { beforeEach, expect, test, vi } from 'vitest'
import { signInCredentials, signInOidc, signOut } from './auth-client'

const sdk = vi.hoisted(() => ({
	credentials: vi.fn(),
	social: vi.fn(),
	signOut: vi.fn()
}))
vi.mock('better-auth/svelte', () => ({
	createAuthClient: () => ({
		$fetch: sdk.credentials,
		signIn: { social: sdk.social },
		signOut: sdk.signOut
	})
}))
beforeEach(() => {
	vi.resetAllMocks()
	for (const operation of Object.values(sdk)) operation.mockResolvedValue({ error: null })
})

test('credentials submit only the two configured fields to the native endpoint', async () => {
	expect(await signInCredentials('admin', 'test-password')).toBeNull()
	expect(sdk.credentials).toHaveBeenCalledExactlyOnceWith('/sign-in/credentials', {
		method: 'POST',
		body: { username: 'admin', password: 'test-password' }
	})
})

test.each([
	{ status: 401, reason: 'CredentialsSignin' },
	{ status: 429, reason: 'RateLimited' },
	{ status: 500, reason: 'AuthError' }
])('credential HTTP$status becomes a reason code, not server copy', async ({ status, reason }) => {
	sdk.credentials.mockResolvedValue({ error: { status, message: 'private native diagnostic' } })
	expect(await signInCredentials('admin', 'test-password')).toBe(reason)
})

test('OIDC preserves a validated destination through both callback paths', async () => {
	const destination = '/admin/piece/books/a%20b.books.md/source?tag=a%26b&filter=a+b'
	expect(await signInOidc(destination)).toBeNull()
	expect(sdk.social).toHaveBeenCalledExactlyOnceWith({
		provider: 'oidc',
		callbackURL: destination,
		errorCallbackURL: `/signin?${new URLSearchParams({ redirectTo: destination })}`
	})
})

test('OIDC errors and throttling do not masquerade as successful navigation', async () => {
	sdk.social.mockResolvedValueOnce({ error: { status: 500 } })
	expect(await signInOidc('/admin')).toBe('AuthError')
	sdk.social.mockResolvedValueOnce({ error: { status: 429 } })
	expect(await signInOidc('/admin')).toBe('RateLimited')
})

test('signout returns success only after the native API succeeds', async () => {
	sdk.signOut.mockResolvedValueOnce({ error: { status: 500 } })
	expect(await signOut()).toBe('AuthError')
	expect(await signOut()).toBeNull()
	expect(sdk.signOut).toHaveBeenCalledTimes(2)
})

test('network failures are reason codes for every operation', async () => {
	for (const operation of Object.values(sdk)) operation.mockRejectedValue(new Error('offline'))
	expect(await signInCredentials('admin', 'test-password')).toBe('NetworkError')
	expect(await signInOidc('/admin')).toBe('NetworkError')
	expect(await signOut()).toBe('NetworkError')
})
