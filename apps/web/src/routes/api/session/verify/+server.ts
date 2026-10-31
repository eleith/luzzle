import { config } from '#lib/server/config.js'
import type { RequestEvent } from './$types'

export async function GET(event: RequestEvent) {
	const headers = { 'Cache-Control': 'private, no-store' }
	if (!config.auth) {
		return new Response('Unauthorized', { status: 401, headers })
	}

	const session = await event.locals.auth?.()
	if (!session) {
		return new Response('Unauthorized', { status: 401, headers })
	}

	return Response.json({ status: 'ok' }, { headers })
}
