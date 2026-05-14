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
					console.log('Content changed, syncing...')
					execSync('npm run sync:content')
				}
			})
		}
	}
}

export default defineConfig({
	define: {
		__VITE__LUZZLE__PIECE__TYPES__: JSON.stringify(config.pieces.map((p) => p.type))
	},
	plugins: [
		enhancedImages(),
		sveltekit(),
		Icons({ compiler: 'svelte' }),
		contentWatcher('./content')
	],
	server: {
		host: host || false,
		allowedHosts: host ? [host, 'localhost'] : ['localhost'],
		hmr: {
			clientPort: hmrPort ? Number(hmrPort) : undefined
		}
	}
})
