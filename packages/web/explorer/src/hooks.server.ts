import '$lib/server/config'
import '$lib/server/database'
import type { Handle } from '@sveltejs/kit'
import { dev } from '$app/environment'
import { generateThemeCss, minifyCss } from '$lib/ui/styles/theme.generator'

const rawCss = generateThemeCss()
const themeCss = dev ? rawCss : minifyCss(rawCss)

export const handle: Handle = async ({ event, resolve }) => {
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
