import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { config } from '$lib/server/config'

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.auth()
	const redirectTo = url.searchParams.get('redirectTo') || '/admin'

	if (session) {
		throw redirect(302, redirectTo)
	}

	return {
		authType: config.auth.type
	}
}
