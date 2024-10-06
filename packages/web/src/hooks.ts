import type { Handle, Reroute } from '@sveltejs/kit'
import themes, { type Theme } from '$lib/ui/styles/themes'
import { sequence } from '@sveltejs/kit/hooks'

export const handleThemeCookie: Handle = async ({ event, resolve }) => {
	const theme = event.cookies.get('theme') as Theme | undefined | 'system'

	if (!theme || !themes.includes(theme as Theme) || theme === 'system') {
		return await resolve(event)
	}

	return await resolve(event, {
		transformPageChunk: ({ html }) => {
			return html.replace('data-theme="system"', `data-theme="${theme}"`)
		}
	})
}

export const handle: Handle = sequence(handleThemeCookie)
export const reroute: Reroute = () => {}
