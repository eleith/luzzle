import { defineConfig } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
	plugins: [sveltekit(), Icons({ compiler: 'svelte' })],
	// Preserve Node integrations and package-relative computed theme imports at runtime.
	ssr: { external: ['@luzzle/core', '@luzzle/web.theme/editor'], noExternal: ['bits-ui'] },
	logLevel: 'error'
})
