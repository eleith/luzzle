import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import Icons from 'unplugin-icons/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
	plugins: [svelte({ configFile: false, hot: false }), Icons({ compiler: 'svelte' })],
	resolve: { alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) } },
	test: {
		include: ['src/**/*.{test,spec}.{ts,js}', 'scripts/**/*.{test,spec}.{ts,js}'],
		exclude: ['build/**', '.svelte-kit/**', 'node_modules/**']
	}
})
