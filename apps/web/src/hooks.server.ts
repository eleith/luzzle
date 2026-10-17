import { config } from '$lib/server/config'
import '$lib/server/database'
import { SvelteKitAuth } from '@auth/sveltekit'

import Credentials from '@auth/core/providers/credentials'
import { sequence } from '@sveltejs/kit/hooks'
import { json, redirect, type Handle } from '@sveltejs/kit'
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

function isProtectedRoute(routeId: string | null) {
	return routeId === '/(auth)' || routeId?.startsWith('/(auth)/') === true
}

const guardHandle: Handle = async ({ event, resolve }) => {
	if (!isProtectedRoute(event.route.id)) return resolve(event)

	const { request } = event
	const browserGet =
		request.method === 'GET' &&
		(event.isDataRequest || request.headers.get('accept')?.includes('text/html'))
	const formAction =
		request.method === 'POST' && request.headers.get('x-sveltekit-action') === 'true'
	const shouldRedirect = browserGet || formAction

	if (!auth) {
		if (shouldRedirect) throw redirect(302, '/')
		return json({ message: 'Forbidden' }, { status: 403 })
	}

	const session = await event.locals.auth()
	if (session) return resolve(event)

	if (!shouldRedirect) return json({ message: 'Unauthorized' }, { status: 401 })
	const params = new URLSearchParams({ redirectTo: event.url.pathname + event.url.search })
	throw redirect(302, `/signin?${params}`)
}

export const handle = authHandle ? sequence(authHandle.handle, guardHandle) : guardHandle
