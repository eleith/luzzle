import adapter from '@sveltejs/adapter-node'
import type { Adapter } from '@sveltejs/kit'
import { getRequest } from '@sveltejs/kit/node'
import { sveltekit } from '@sveltejs/kit/vite'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import Icons from 'unplugin-icons/vite'
import { enhancedImages } from '@sveltejs/enhanced-img'
import { loadConfig } from '@luzzle/web.templates/config'
import { resolveAppOrigin } from './scripts/runtime-environment.js'

function extractHostname(url: string | undefined): string | undefined {
	if (!url) return undefined
	try {
		return new URL(url).hostname
	} catch {
		return undefined
	}
}

function createAdapter(origin: string | undefined): Adapter {
	const native = adapter()
	if (!origin) return native
	const nativeVite = native.vite
	return {
		...native,
		vite: (context) => {
			const settings = typeof nativeVite === 'function' ? nativeVite(context) : nativeVite
			return {
				...settings,
				getRequest: (options) => getRequest({ ...options, base: origin })
			}
		}
	}
}

export default defineConfig(({ command }) => {
	const config = command === 'serve' ? loadConfig('./config.yaml') : undefined
	const appOrigin = config ? resolveAppOrigin(config.url.app) : undefined
	const host = config?.network?.public?.host
	const hmrPort = config?.network?.public?.hmr_port
	const allowedHosts = Array.from(
		new Set(
			[
				'localhost',
				extractHostname(config?.url.app),
				extractHostname(config?.network.internal.explorer)
			].filter((value): value is string => !!value)
		)
	)
	const sourceFirst = command === 'serve' && !process.env.VITEST

	return {
		plugins: [
			enhancedImages(),
			sveltekit({
				compilerOptions: { experimental: { async: true } },
				preprocess: [vitePreprocess()],
				adapter: createAdapter(appOrigin),
				csrf: { trustedOrigins: ['http://localhost:3000', 'http://localhost:5173'] },
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
				paths: { assets: '' },
				prerender: { concurrency: 8, handleHttpError: 'warn', crawl: false }
			}),
			Icons({ compiler: 'svelte' })
		],
		// Keep computed Shiki imports relative to their owning runtime package.
		ssr: sourceFirst ? { noExternal: [/^@luzzle\//] } : { external: ['@luzzle/web.theme/editor'] },
		server: {
			host: host || false,
			allowedHosts,
			hmr: { clientPort: hmrPort ? Number(hmrPort) : undefined }
		}
	}
})
