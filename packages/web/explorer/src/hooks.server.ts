import '$lib/server/config'
import '$lib/server/database'
import type { Handle } from '@sveltejs/kit'
import { generateThemeCss } from '$lib/ui/styles/theme.generator'

export const handle: Handle = async ({ event, resolve }) => {
	const themeCss = generateThemeCss()
	let buffer = ''

	const response = await resolve(event, {
		transformPageChunk: ({ html, done }) => {
			buffer += html

			if (done) {
				return buffer.replace('%luzzle.theme.style.tag%', `<style>${themeCss}</style>`)
			}
		}
	})

	return response
}
