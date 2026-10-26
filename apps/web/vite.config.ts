import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'
import Icons from 'unplugin-icons/vite'
import { enhancedImages } from '@sveltejs/enhanced-img'
import { loadConfig } from '@luzzle/web.templates/config'

function extractHostname(url: string | undefined): string | undefined {
	if (!url) return undefined
	try {
		return new URL(url).hostname
	} catch {
		return undefined
	}
}

export default defineConfig(({ command }) => {
	const config = command === 'serve' ? loadConfig('./config.yaml') : undefined
	const host = config?.network?.public?.host
	const hmrPort = config?.network?.public?.hmr_port
	const allowedHosts = Array.from(
		new Set(
			[
				'localhost',
				extractHostname(config?.url.app),
				extractHostname(config?.network.internal.explorer)
			].filter((h): h is string => !!h)
		)
	)
	const sourceFirst = command === 'serve' && !process.env.VITEST

	return {
		plugins: [enhancedImages(), sveltekit(), Icons({ compiler: 'svelte' })],
		// Keep computed Shiki imports relative to their owning runtime package.
		ssr: sourceFirst ? { noExternal: [/^@luzzle\//] } : { external: ['@luzzle/web.theme/editor'] },
		server: {
			host: host || false,
			allowedHosts,
			hmr: {
				clientPort: hmrPort ? Number(hmrPort) : undefined
			}
		}
	}
})
