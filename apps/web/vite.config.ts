import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import Icons from 'unplugin-icons/vite'
import { enhancedImages } from '@sveltejs/enhanced-img'
import { loadConfig } from '@luzzle/web.config'
import path from 'path'
import { execSync } from 'child_process'

const config = loadConfig('./config.yaml')
const host = config.network?.public?.host
const hmrPort = config.network?.public?.hmr_port

function extractHostname(url: string | undefined): string | undefined {
	if (!url) return undefined
	try {
		return new URL(url).hostname
	} catch {
		return undefined
	}
}

const allowedHosts = Array.from(
	new Set(
		[
			'localhost',
			extractHostname(config.url?.app),
			extractHostname(config.network?.internal?.explorer)
		].filter((h): h is string => !!h)
	)
)

const contentWatcher = (relativeContentPath: string): Plugin => {
	return {
		name: 'content-watcher',
		apply: 'serve',
		configureServer(server: ViteDevServer) {
			const targetPath = path.resolve(process.cwd(), relativeContentPath)
			console.log(`[Content Watcher] Watching: ${targetPath}`)
			server.watcher.add(targetPath)
			server.watcher.on('change', (path) => {
				if (path.includes(targetPath)) {
					console.log('Content changed, rebuilding...')
					execSync('pnpm run build:content')
				}
			})
		}
	}
}

export default defineConfig(({ command }) => {
	const sourceFirst = command === 'serve' && !process.env.VITEST

	return {
		define: {
			__VITE__LUZZLE__PIECE__TYPES__: JSON.stringify(config.pieces.map((p) => p.type))
		},
		plugins: [
			enhancedImages(),
			sveltekit(),
			Icons({ compiler: 'svelte' }),
			contentWatcher('./content')
		],
		ssr: sourceFirst ? { noExternal: [/^@luzzle\//] } : {},
		server: {
			host: host || false,
			allowedHosts,
			hmr: {
				clientPort: hmrPort ? Number(hmrPort) : undefined
			}
		}
	}
})
