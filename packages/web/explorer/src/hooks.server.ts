import { config } from '$lib/server/config'
import '$lib/server/database'
import { SvelteKitAuth } from '@auth/sveltekit'
import { sequence } from '@sveltejs/kit/hooks'
import { redirect, type Handle } from '@sveltejs/kit'

const authHandle = SvelteKitAuth({
	trustHost: true,
	secret: config.auth.secret,
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

const guardHandle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/editor')) {
		if (!config.auth.enabled) {
			throw redirect(302, '/')
		}

		const session = await event.locals.auth()
		if (!session) {
			throw redirect(302, '/auth/signin')
		}
	}

	return resolve(event)
}

export const handle = sequence(authHandle.handle, guardHandle)
