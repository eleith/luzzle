import { defineConfig } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
	plugins: [sveltekit(), Icons({ compiler: 'svelte' })],
	// Match the app's external core dependency rather than bundling its optional Node integrations.
	ssr: { external: ['@luzzle/core'], noExternal: ['bits-ui'] },
	logLevel: 'error'
})
