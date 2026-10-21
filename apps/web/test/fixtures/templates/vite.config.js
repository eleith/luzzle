import { defineConfig } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
	plugins: [sveltekit(), Icons({ compiler: 'svelte' })],
	ssr: { noExternal: ['bits-ui'] },
	define: { __VITE__LUZZLE__PIECE__TYPES__: JSON.stringify(['custom-kind']) },
	logLevel: 'error'
})
