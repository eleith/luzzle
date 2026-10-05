import { config } from '$lib/server/config'
import '$lib/server/database'
import { SvelteKitAuth } from '@auth/sveltekit'

import Credentials from '@auth/core/providers/credentials'
import { sequence } from '@sveltejs/kit/hooks'
import { redirect, type Handle } from '@sveltejs/kit'
import type { Provider } from '@auth/core/providers'

const auth = config.auth
const providers: Provider[] = []

if (auth && 'oidc' in auth) {
	providers.push({
		id: 'oidc',
		name: auth.oidc.name,
		type: 'oidc',
		issuer: auth.oidc.issuer,
		clientId: auth.oidc.clientId,
		clientSecret: auth.oidc.clientSecret,
		checks: ['state'],
		style: {
			logo: `${config.url.app_assets}/images/favicon.png`
		}
	})
}

if (auth && 'credentials' in auth) {
	const user = auth.credentials
	providers.push(
		Credentials({
			credentials: {
				username: { label: 'Username', type: 'text' },
				password: { label: 'Password', type: 'password' }
			},
			async authorize(credentials) {
				if (user.username === credentials?.username && user.password === credentials?.password) {
					return { id: user.username, name: user.username, email: `${user.username}@luzzle.local` }
				}

				return null
			}
		})
	)
}

const authHandle = auth
	? SvelteKitAuth({
			trustHost: true,
			secret: auth.secret,
			pages: {
				signIn: '/signin'
			},
			providers
		})
	: undefined

const PROTECTED_PREFIXES = ['/admin', '/api/admin']

const guardHandle: Handle = async ({ event, resolve }) => {
	const isProtected = PROTECTED_PREFIXES.some((prefix) => event.url.pathname.startsWith(prefix))

	if (isProtected) {
		if (!auth) {
			throw redirect(302, '/')
		}

		const session = await event.locals.auth()
		if (!session) {
			throw redirect(302, `/signin?redirectTo=${event.url.pathname}`)
		}
	}

	return resolve(event)
}

export const handle = authHandle ? sequence(authHandle.handle, guardHandle) : guardHandle
