import { preprocessMeltUI, sequence } from '@melt-ui/pp'
import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import config from './config/svelte.loader.js'

/** @type {import('@sveltejs/kit').Config}*/
const svelteConfig = {
	preprocess: sequence([vitePreprocess(), preprocessMeltUI()]),
	kit: {
		adapter: adapter(),
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': [
					'self',
					'unsafe-hashes',
					'sha256-7dQwUgLau1NFCCGjfn9FsYptB6ZtWxJin6VohGIu20I=',
					'sha256-xn22ltVON/Snvkt10s93XAovWcCOYzs+b4VC4GwZ+/o=',
					`${config.urls.app}/`
				].filter((src) => src !== '/'),
				'style-src': ['self', 'unsafe-inline', `${config.urls.app}/`].filter((src) => src !== '/'),
				'img-src': ['self', 'data:', `${config.urls.app}/`, `${config.urls.assets}/`].filter(
					(src) => src !== '/'
				),
				'connect-src': ['self'],
				'font-src': ['self', `${config.urls.app}/`].filter((src) => src !== '/'),
				'object-src': ['none'],
				'base-uri': ['self'],
				'frame-ancestors': ['none']
			}
		},
		inlineStyleThreshold: 3072,
		paths: {
			assets: config.urls.app
		},
		prerender: {
			concurrency: 8,
			handleHttpError: 'warn',
			crawl: false
		}
	}
}

export default svelteConfig
