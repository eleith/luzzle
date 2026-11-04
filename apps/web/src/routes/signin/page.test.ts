import { afterAll, expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { ComponentProps } from 'svelte'
import type { ConfigPublic } from '@luzzle/web.config'
import { makePublicConfig } from '#lib/server/config.fixture.js'
import Signin from './+page.svelte'
import SigninTree from './fixtures/SigninTree.svelte'

const { page } = vi.hoisted(() => ({
	page: {
		url: new URL('https://app.test/signin'),
		data: {
			config: undefined as ConfigPublic | undefined,
			meta: { title: 'Test Garden', description: 'An archive' }
		}
	}
}))
vi.mock('$app/state', () => ({ page }))
vi.mock('$app/env', () => ({ browser: false }))
vi.mock('$app/paths', () => ({ resolve: (path: string) => (path === '' ? '/' : path) }))
vi.mock('$app/navigation', () => ({ goto: vi.fn() }))
// Client authentication must remain lazy during SSR, even with invalid ambient settings.
vi.hoisted(() => vi.stubEnv('BETTER_AUTH_URL', 'not-a-url'))
afterAll(() => vi.unstubAllEnvs())

function signinData(): ComponentProps<typeof Signin>['data'] {
	const config = makePublicConfig()
	config.content.text.title = 'Test Garden'
	config.content.images.favicon = '/assets/favicon/garden.svg'
	return {
		pieceTypes: [],
		config,
		meta: { title: 'Test Garden', description: 'An archive' },
		redirectTo: '/admin',
		authType: 'credentials',
		oidcName: undefined,
		errorCode: null
	}
}

test('credentials use configured branding and named POST controls with password-manager hints', () => {
	const data = signinData()

	const result = render(Signin, { props: { data, params: {}, form: null } })
	const html = result.body.replace(/<!--[\s\S]*?-->/g, '')

	expect(html).toContain('Sign in to Test Garden')
	expect(html).toContain('src="/assets/favicon/garden.svg"')
	expect(html).toMatch(/<form\b[^>]*\bmethod="post"/i)
	expect(html).toMatch(/<input\b(?=[^>]*\bname="username")(?=[^>]*\bautocomplete="username")[^>]*>/)
	expect(html).toMatch(
		/<input\b(?=[^>]*\bname="password")(?=[^>]*\btype="password")(?=[^>]*\bautocomplete="current-password")[^>]*>/
	)
	expect(result.head).toContain('Sign in — Test Garden')
})

test('OIDC offers the selected provider without presenting local credential fields', () => {
	const data = signinData()
	data.authType = 'oidc'
	data.oidcName = 'Our SSO'

	const { body } = render(Signin, { props: { data, params: {}, form: null } })
	const html = body.replace(/<!--[\s\S]*?-->/g, '')

	expect(html).toContain('Sign in with Our SSO')
	expect(html).toMatch(/<button\b[^>]*\btype="submit"/)
	expect(html).not.toMatch(/<input\b/)
})

test('a callback failure is announced without removing the selected sign-in method', () => {
	const data = signinData()
	data.authType = 'oidc'
	data.oidcName = 'Our SSO'
	data.errorCode = 'AuthError'

	const { body } = render(Signin, { props: { data, params: {}, form: null } })
	const html = body.replace(/<!--[\s\S]*?-->/g, '')

	expect(html).toContain('role="alert"')
	expect(html).toContain('Unable to sign in. Please try again.')
	expect(html).toContain('Sign in with Our SSO')
})

test('the sign-in layout keeps branding, theme and return navigation without public search', () => {
	const data = signinData()
	page.data.config = data.config

	const result = render(SigninTree, { props: { data } })

	expect(result.body.match(/<main\b/g)).toHaveLength(1)
	expect(result.body).toContain('href="/"')
	expect(result.body).toContain('Back to site')
	expect(result.body).toContain('aria-label="change theme"')
	expect(result.body).not.toContain('aria-label="search"')
	expect(result.head).toContain('rel="icon" href="/assets/favicon/garden.svg"')
	expect(result.head).toContain('Sign in — Test Garden')
	expect(result.head).toContain('name="robots" content="noindex"')
})
