import { preprocessMeltUI, sequence } from '@melt-ui/pp'
import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config}*/
const config = {
	preprocess: sequence([vitePreprocess(), preprocessMeltUI()]),
	kit: {
		adapter: adapter(),
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'unsafe-hashes', 'sha256-7dQwUgLau1NFCCGjfn9FsYptB6ZtWxJin6VohGIu20I=', 'sha256-xn22ltVON/Snvkt10s93XAovWcCOYzs+b4VC4GwZ+/o=', `${process.env.PUBLIC_CLIENT_APP_URL}/`],
				'style-src': [
					'self',
					'unsafe-inline',
					`${process.env.PUBLIC_CLIENT_APP_URL}/`
				],
				'img-src': ['self', 'data:', `${process.env.PUBLIC_CLIENT_APP_URL}/`, `${process.env.PUBLIC_IMAGES_URL}/`],
				'connect-src': ['self'],
				'font-src': ['self', `${process.env.PUBLIC_CLIENT_APP_URL}/`],
				'object-src': ['none'],
				'base-uri': ['self'],
				'frame-ancestors': ['none']
			},
		},
		inlineStyleThreshold: 3072,
		paths: {
			assets: process.env.PUBLIC_CLIENT_APP_URL
		},
		prerender: {
			concurrency: 8,
			handleHttpError: 'warn',
			crawl: false
		}
	}
}

export default config
