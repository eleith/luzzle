import { json } from '@sveltejs/kit'
import { config } from '$lib/server/config'
import type { RequestEvent } from './$types'

export async function GET(event: RequestEvent) {
	if (!config.auth.enabled) {
		return json({ status: 'ok' })
	}

	const session = await event.locals.auth?.()
	if (!session) {
		return new Response('Unauthorized', { status: 401 })
	}

	return json({ status: 'ok' })
}
