import { preprocessMeltUI, sequence } from '@melt-ui/pp'
import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local', override: true })

const production = process.env.NODE_ENV === 'production'
const cdn = process.env.PUBLIC_ASSETS_CDN_URL || ''

/** @type {import('@sveltejs/kit').Config}*/
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: sequence([vitePreprocess(), preprocessMeltUI()]),
	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter(),
		prerender: {
			concurrency: 4,
			handleHttpError: 'warn'
		},
		paths: {
			assets: production ? cdn : ''
		}
	}
}

export default config
