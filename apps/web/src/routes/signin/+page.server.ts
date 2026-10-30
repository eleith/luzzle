import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { config } from '$lib/server/config'
import { localRedirect } from '$lib/server/redirect'

export const load: PageServerLoad = async ({ locals, url }) => {
	const auth = config.auth
	if (!auth) throw redirect(302, '/')

	const session = await locals.auth()
	const redirectTo = localRedirect(url.searchParams.get('redirectTo'), url.origin)

	if (session) {
		throw redirect(302, redirectTo)
	}

	let errorCode: 'AuthError' | null = null
	if (url.searchParams.has('error')) errorCode = 'AuthError'

	return {
		redirectTo,
		authType: 'credentials' in auth ? 'credentials' : 'oidc',
		oidcName: 'oidc' in auth ? auth.oidc.name : undefined,
		errorCode
	}
}
