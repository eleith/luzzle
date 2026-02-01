import { config } from '$lib/server/config'
import '$lib/server/database'
import { SvelteKitAuth } from '@auth/sveltekit'
import { sequence } from '@sveltejs/kit/hooks'
import { redirect, type Handle } from '@sveltejs/kit'

const authHandle = SvelteKitAuth({
	trustHost: true,
	secret: config.auth.secret,
	pages: {
		signIn: '/signin'
	},
	providers: [
		{
			id: 'oidc',
			name: 'OIDC',
			type: 'oidc',
			issuer: config.auth.oidc.issuer,
			clientId: config.auth.oidc.clientId,
			clientSecret: config.auth.oidc.clientSecret,
			style: {
				logo: `${config.url.app_assets}/images/favicon.png`
			}
		}
	]
})

const PROTECTED_PREFIXES = ['/editor', '/builder', '/api/build']

const guardHandle: Handle = async ({ event, resolve }) => {
	const isProtected = PROTECTED_PREFIXES.some((prefix) => event.url.pathname.startsWith(prefix))

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
