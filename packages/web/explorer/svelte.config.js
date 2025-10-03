import { preprocessMeltUI, sequence } from '@melt-ui/pp'
import adapter from '@sveltejs/adapter-node'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { loadConfig } from '@luzzle/tools'
import * as path from 'path'
import { existsSync } from 'fs'

// Use import.meta.url to get the current module's URL, then find the path on disk
const configPath = path.resolve(import.meta.dirname, 'config.yaml')
const userConfigPath = existsSync(configPath) ? configPath : undefined
const config = loadConfig(userConfigPath)

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
					'sha256-IkSJz6bJHlgEJX/qrZfLQujPiGpWsHJXQZ7PqTVra1Y=',
					`${config.url.app_assets}/`
				].filter((src) => src !== '/'),
				'style-src': ['self', 'unsafe-inline', `${config.url.app_assets}/`].filter(
					(src) => src !== '/'
				),
				'img-src': [
					'self',
					'data:',
					`${config.url.app_assets}/`,
					`${config.url.luzzle_assets}/`
				].filter((src) => src !== '/'),
				'connect-src': ['self'],
				'font-src': ['self', `${config.url.app_assets}/`].filter((src) => src !== '/'),
				'object-src': ['none'],
				'base-uri': ['self'],
				'frame-ancestors': ['none']
			}
		},
		inlineStyleThreshold: 3072,
		paths: {
			assets: config.url.app_assets
		},
		prerender: {
			concurrency: 8,
			handleHttpError: 'warn',
			crawl: false
		}
	}
}

export default svelteConfig
