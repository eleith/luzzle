import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config}*/
const config = {
	preprocess: [vitePreprocess()],
	kit: {
		adapter: adapter(),
		inlineStyleThreshold: 3072,
		prerender: {
			concurrency: 4,
			handleHttpError: 'warn'
		}
	}
}

export default config
