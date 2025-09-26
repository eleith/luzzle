import { dev } from '$app/environment'
import { generateThemeCss, minifyCss } from '$lib/ui/styles/theme.generator'

const rawCss = generateThemeCss()
const themeCss = dev ? rawCss : minifyCss(rawCss)

export const GET = () => {
	return new Response(themeCss, {
		headers: {
			'Content-Type': 'text/css',
			'Cache-Control': dev ? 'no-cache' : 'public, max-age=31536000, immutable'
		}
	})
}
