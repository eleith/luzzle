import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const svelteConfig = {
	compilerOptions: {
		experimental: {
			async: true
		}
	},
	preprocess: [vitePreprocess()],
	kit: {
		adapter: adapter(),
		csrf: {
			trustedOrigins: ['http://localhost:3000', 'http://localhost:5173']
		},
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': [
					'self',
					'unsafe-hashes',
					'sha256-7dQwUgLau1NFCCGjfn9FsYptB6ZtWxJin6VohGIu20I=',
					'sha256-8oa0zHl7YAxAhiYNg8fadxmsU54ezUB+oZ/NjM03xVk='
				],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:'],
				'connect-src': ['self'],
				'font-src': ['self'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'frame-ancestors': ['none']
			}
		},
		inlineStyleThreshold: 3072,
		paths: {
			assets: ''
		},
		prerender: {
			concurrency: 8,
			handleHttpError: 'warn',
			crawl: false
		}
	}
}

export default svelteConfig
