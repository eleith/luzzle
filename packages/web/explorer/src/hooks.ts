import type { Handle, Reroute } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

export const handler: Handle = async ({ event, resolve }) => {
	return await resolve(event)
}

export const handle: Handle = sequence(handler)
export const reroute: Reroute = () => {}
