import { config } from '$lib/server/config'
import '$lib/server/database'
import { SvelteKitAuth } from '@auth/sveltekit'
import Credentials from '@auth/core/providers/credentials'
import { sequence } from '@sveltejs/kit/hooks'
import { redirect, type Handle } from '@sveltejs/kit'
import type { Provider } from '@auth/core/providers'

const providers: Provider[] = []

if (config.auth.type === 'oidc' && config.auth.oidc) {
	providers.push({
		id: 'oidc',
		name: 'OIDC',
		type: 'oidc',
		issuer: config.auth.oidc.issuer,
		clientId: config.auth.oidc.clientId,
		clientSecret: config.auth.oidc.clientSecret,
		style: {
			logo: `${config.url.app_assets}/images/favicon.png`
		}
	})
}

if (config.auth.type === 'credentials' && config.auth.credentials) {
	providers.push(
		Credentials({
			credentials: {
				username: { label: 'Username', type: 'text' },
				password: { label: 'Password', type: 'password' }
			},
			async authorize(credentials) {
				const user = config.auth.credentials

				if (
					user &&
					user.username === credentials?.username &&
					user.password === credentials?.password
				) {
					return { id: user.username, name: user.username, email: `${user.username}@luzzle.local` }
				}

				return null
			}
		})
	)
}

const authHandle = SvelteKitAuth({
	trustHost: true,
	secret: config.auth.secret,
	pages: {
		signIn: '/signin'
	},
	providers
})

const PROTECTED_PREFIXES = ['/editor', '/builder', '/api/build', '/api/editor']

const guardHandle: Handle = async ({ event, resolve }) => {
	const isProtected =
		PROTECTED_PREFIXES.some((prefix) => event.url.pathname.startsWith(prefix)) ||
		event.url.pathname.endsWith('.edit')

	if (isProtected) {
		if (!config.auth.enabled) {
			throw redirect(302, '/')
		}

		const session = await event.locals.auth()
		if (!session) {
			throw redirect(302, `/signin?redirectTo=${event.url.pathname}`)
		}
	}

	return resolve(event)
}

export const handle = config.auth.enabled ? sequence(authHandle.handle, guardHandle) : guardHandle
