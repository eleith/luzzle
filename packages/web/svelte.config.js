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
			assets: process.env.PUBLIC_ASSETS_CDN_URL
		},
		prerender: {
			concurrency: 4,
			handleHttpError: 'warn'
		}
	}
}

export default config
