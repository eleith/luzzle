import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { fileURLToPath } from 'node:url'
import { createServer, type ViteDevServer } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import type { render as Render } from 'svelte/server'
import type { Component } from 'svelte'
import type { PublicWebPiece } from '@luzzle/web.pieces'

const lib = fileURLToPath(new URL('../../', import.meta.url))
const wrapper = fileURLToPath(new URL('./icon.svelte', import.meta.url))
type Props = {
	piece: PublicWebPiece
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
		root: fileURLToPath(new URL('../../../../', import.meta.url)),
		server: { middlewareMode: true },
		optimizeDeps: { noDiscovery: true },
		plugins: [
			{
				name: 'configured-icon-fixtures',
				enforce: 'pre',
				resolveId(id) {
					if (id === '$app/state') return '\0icon-test-page'
				},
				load(id) {
					if (id === '\0icon-test-page') return 'export const page = { data: {} }'
				},
				transform(source, id) {
					// Redirect only glob discovery to actual fixture sources. The real wrapper and
					// its configured/default children compile together in the normal Svelte runtime.
					if (id === wrapper)
						return source.replace(
							'$lib/pieces/components/custom/*/icon.svelte',
							'$lib/pieces/components/fixtures/configured-icons/*/icon.svelte'
						)
				}
			},
			svelte({
				configFile: false,
				hot: false,
				compilerOptions: { experimental: { async: true } }
			})
		],
		resolve: { alias: { $lib: lib } }
	})
	Icon = (await server.ssrLoadModule(wrapper)).default
	render = (await server.ssrLoadModule('svelte/server')).render
	page = (await server.ssrLoadModule('$app/state')).page
})

afterAll(async () => {
	await server?.close()
})

beforeEach(() => {
	page.data = {
		config: {
			url: {
				app: 'https://app.example/garden/',
				luzzle_assets: 'https://assets.example/archive/?ignored=yes#fragment',
				app_assets: 'https://static.example/site/?ignored=yes#fragment'
			}
		}
	}
})

function piece(type = 'configured'): PublicWebPiece {
	return {
		id: 'configured-piece',
		key: 'piece-key',
		type,
		slug: 'a piece',
		title: '<Piece>&',
		date_added: 1,
		metadata: { cover: 'cover' },
		keywords: '["tag"]',
		assets: [
			{
				asset_key: 'cover',
				transformation: 'image.original',
				asset_path: 'books/cover key/original.jpg',
				mime_type: 'image/jpeg'
			},
			{
				asset_key: 'cover',
				transformation: 'palette',
				content: '{"accent":"#123456"}',
				mime_type: 'application/json'
			}
		]
	}
}

async function html(props: Partial<Props> = {}) {
	return (await render(Icon, { props: { piece: piece(), size: { width: 125 }, ...props } })).body
}

describe('legacy configured icon consumer SSR', () => {
	test('passes only the v1 data/options/base helpers to a real configured component', async () => {
		const body = await html()
		expect(body).toContain('class="configured-icon"')
		expect(body).toContain('data-props="data,helpers,options"')
		expect(body).toContain('data-helpers="forPiece,getStaticAssetUrl"')
		expect(body).toContain('data-size="125x187.5" data-lazy="false" data-active="false"')
		expect(body).toContain('href="https://app.example/garden/pieces/configured/a%20piece"')
		expect(body).toContain(
			'src="https://assets.example/archive/pieces/assets/books/cover%20key/original.jpg"'
		)
		expect(body).toContain('data-accent="#123456"')
		expect(body).toContain('data-static="https://static.example/site/images/favicon.png"')
		expect(body).not.toContain('data-invalid-static=')
		expect(body).toContain('&lt;Piece>&amp;')
	})

	test('resolves explicit options and current preview job without published asset fallback', async () => {
		page.data.preview = true
		page.data.job = 'first job'
		const first = await html({ size: { width: 80, height: 93 }, lazy: true, active: true })
		expect(first).toContain('data-size="80x93" data-lazy="true" data-active="true"')
		expect(first).toContain('src="/admin/preview/first%20job/asset/books/cover%20key/original.jpg"')
		expect(first).not.toContain('https://assets.example')
		page.data = { ...page.data, job: 'second job' }
		const second = await html()
		expect(second).toContain(
			'src="/admin/preview/second%20job/asset/books/cover%20key/original.jpg"'
		)
		expect(second).not.toContain('/first%20job/')
		page.data.job = '../invalid'
		const invalid = await html()
		expect(invalid).not.toContain('src=')
		expect(invalid).not.toContain('https://assets.example')
	})

	test.each(['', '/site/'])('constructs native static asset URLs with base %j', async (base) => {
		page.data.config.url = { app: '/garden/', app_assets: base, luzzle_assets: '' }
		const body = await html()
		expect(body).toContain('href="/garden/pieces/configured/a%20piece"')
		expect(body).toContain('src="/garden/pieces/assets/books/cover%20key/original.jpg"')
		expect(body).toContain(`data-static="${base.replace(/\/+$/, '')}/images/favicon.png"`)
	})

	test.each(['unknown', 'import-failed'])(
		'uses the actual legacy default adapter when %s has no usable configured import',
		async (type) => {
			const body = await html({
				piece: piece(type),
				size: { width: 80, height: 93 },
				lazy: true,
				active: true
			})
			expect(body).toMatch(/class="default-icon [^"]*\bactive\b/)
			expect(body).toContain('--piece-icon-height: 93px;')
			expect(body).toContain('loading="lazy"')
			expect(body).toContain(
				'src="https://assets.example/archive/pieces/assets/books/cover%20key/original.jpg"'
			)
			expect(body).toContain('&lt;Piece>&amp;')
			expect(body).not.toContain('configured-icon')
		}
	)
})
