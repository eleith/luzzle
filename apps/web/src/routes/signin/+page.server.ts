import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { config } from '$lib/server/config'

export const load: PageServerLoad = async ({ locals, url }) => {
	const auth = config.auth
	if (!auth) throw redirect(302, '/')

	const session = await locals.auth()
	const redirectTo = url.searchParams.get('redirectTo') || '/admin'

	if (session) {
		throw redirect(302, redirectTo)
	}

	return {
		authType: 'credentials' in auth ? 'credentials' : 'oidc',
		oidcName: 'oidc' in auth ? auth.oidc.name : undefined
	}
}
