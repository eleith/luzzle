import { afterAll, beforeAll, expect, test } from 'vitest'
import { fileURLToPath } from 'node:url'
import { createServer, type ViteDevServer } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import type { render as Render } from 'svelte/server'
import type { Component } from 'svelte'
import type { TemplatedPiece } from '@luzzle/web.templates/pieces/fields'

const lib = fileURLToPath(new URL('../../', import.meta.url))
const wrapper = fileURLToPath(new URL('./icon.svelte', import.meta.url))
type Props = {
	piece: TemplatedPiece
	size: { width: number; height?: number }
	lazy?: boolean
	active?: boolean
}
type PageData = {
	config: { url: { app: string; app_assets: string; luzzle_assets: string } }
	preview?: boolean
	job?: string
}
let server: ViteDevServer
let Icon: Component<Props>
let render: typeof Render
let page: { data: PageData }

beforeAll(async () => {
	server = await createServer({
		configFile: false,
		cacheDir: fileURLToPath(
			new URL('../../../../node_modules/.cache/catalog-icon', import.meta.url)
		),
		root: fileURLToPath(new URL('../../../../', import.meta.url)),
		server: { middlewareMode: true, hmr: false },
		optimizeDeps: { noDiscovery: true },
		plugins: [
			{
				name: 'icon-test-page',
				enforce: 'pre',
				resolveId(id) {
					if (id === '$app/state') return '\0icon-test-page'
				},
				load(id) {
					if (id === '\0icon-test-page') return 'export const page = { data: {} }'
				}
			},
			svelte({ configFile: false })
		],
		resolve: { alias: { '#lib': lib } }
	})
	Icon = (await server.ssrLoadModule(wrapper)).default
	render = (await server.ssrLoadModule('svelte/server')).render
	page = (await server.ssrLoadModule('$app/state')).page
})

afterAll(async () => {
	await server?.close()
})

function piece(): TemplatedPiece {
	return {
		id: 'configured-piece',
		key: 'piece-key',
		type: 'inventory',
		slug: 'a piece',
		title: 'Piece',
		date_added: 1,
		metadata: {},
		keywords: '[]',
		assets: [
			{
				asset_key: 'cover',
				transformation: 'image.original',
				asset_path: 'books/cover key/original.jpg',
				mime_type: 'image/jpeg'
			}
		],
		templates: {
			icon: { name: 'default', fields: { image: 'cover' } },
			page: { name: 'default', fields: {} },
			opengraph: { name: 'default', fields: {} }
		}
	}
}

test('icon consumer uses a relative app base for published assets when no CDN is configured', async () => {
	page.data = {
		config: { url: { app: '/garden/', app_assets: '/static/', luzzle_assets: '' } }
	}

	const body = (await render(Icon, { props: { piece: piece(), size: { width: 125 } } })).body

	expect(body).toContain('src="/garden/pieces/assets/books/cover%20key/original.jpg"')
})
