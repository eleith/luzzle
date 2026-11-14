import adapter from '@sveltejs/adapter-node'
import type { Adapter } from '@sveltejs/kit'
import { getRequest } from '@sveltejs/kit/node'
import { sveltekit } from '@sveltejs/kit/vite'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, type ServerOptions } from 'vite'
import Icons from 'unplugin-icons/vite'
import { enhancedImages } from '@sveltejs/enhanced-img'

type DevServerSettings = Pick<ServerOptions, 'host' | 'allowedHosts' | 'hmr'> & {
	appOrigin?: string
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
	// The development manager supplies networking settings after validating YAML.
	// Editors resolve this config too, without starting the application.
	const { appOrigin, ...server } = (
		command === 'serve' ? JSON.parse(process.env.LUZZLE_DEV_SERVER || '{}') : {}
	) as DevServerSettings
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
		server: { host: false, allowedHosts: ['localhost'], ...server }
	}
})
