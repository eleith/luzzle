import { preprocessMeltUI, sequence } from '@melt-ui/pp'
import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config}*/
const config = {
	preprocess: sequence([vitePreprocess(), preprocessMeltUI()]),
	kit: {
		adapter: adapter(),
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
