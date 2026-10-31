import adapter from '@sveltejs/adapter-node'
import { defineConfig } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { fileURLToPath } from 'node:url'
import Icons from 'unplugin-icons/vite'

const appLibrary = fileURLToPath(new URL('../../../src/lib/', import.meta.url))

export default defineConfig({
	resolve: { alias: { '#lib': appLibrary } },
	plugins: [
		sveltekit({
			compilerOptions: { experimental: { async: true } },
			adapter: adapter({ out: process.env.TEMPLATE_BUILD_DIR }),
			outDir: process.env.TEMPLATE_KIT_DIR,
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'object-src': ['none']
				}
			}
		}),
		Icons({ compiler: 'svelte' })
	],
	// Preserve Node integrations and package-relative computed theme imports at runtime.
	ssr: { external: ['@luzzle/core', '@luzzle/web.theme/editor'], noExternal: ['bits-ui'] },
	logLevel: 'error'
})
