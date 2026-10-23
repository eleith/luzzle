import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { fileURLToPath } from 'node:url'
import { createServer, type ViteDevServer } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import type { render as Render } from 'svelte/server'
import type { Component } from 'svelte'
import type { PublicWebPiece } from '@luzzle/web.pieces'
import { mapPieceTemplates, type TemplatedPiece } from '@luzzle/web.templates/pieces/fields'

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
		root: fileURLToPath(new URL('../../../../', import.meta.url)),
		server: { middlewareMode: true },
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
			svelte({ configFile: false, hot: false })
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

function piece(type = 'arbitrary-kind'): TemplatedPiece {
	const source: PublicWebPiece = {
		id: 'configured-piece',
		key: 'piece-key',
		type,
		slug: 'a piece',
		title: '<Piece>&',
		date_added: 1,
		metadata: { art: { thumbnail: 'cover' }, poster: 'not-mapped' },
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
	return mapPieceTemplates(source, {
		type,
		fields: { title: 'title', date_consumed: 'date' },
		templates: {
			icon: { name: 'default', mapping: { image: 'art.thumbnail' } },
			page: { name: 'default', mapping: {} },
			opengraph: { name: 'default', mapping: {} }
		}
	})
}

async function html(props: Partial<Props> = {}) {
	return (await render(Icon, { props: { piece: piece(), size: { width: 125 }, ...props } })).body
}

describe('static default icon consumer SSR', () => {
	test('renders mapped fields for arbitrary piece types with normal default props', async () => {
		const body = await html()
		expect(body).toContain('class="poster ')
		expect(body).toContain('--piece-icon-width: 125px;')
		expect(body).toContain('--piece-icon-height: 187.5px;')
		expect(body).toContain('loading="eager" fetchpriority="high"')
		expect(body).toContain(
			'src="https://assets.example/archive/pieces/assets/books/cover%20key/original.jpg"'
		)
		expect(body).toContain('&lt;Piece>&amp;')
		expect(body).not.toContain('configured-icon')
	})

	test('honors explicit size, active styling and lazy loading', async () => {
		const body = await html({ size: { width: 80, height: 93 }, lazy: true, active: true })
		expect(body).toContain('--piece-icon-width: 80px;')
		expect(body).toContain('--piece-icon-height: 93px;')
		expect(body).toMatch(/class="poster [^"]*\bactive\b/)
		expect(body).toContain('loading="lazy" fetchpriority="auto"')
	})

	test('uses current preview job without published asset fallback', async () => {
		page.data.preview = true
		page.data.job = 'first job'
		const first = await html()
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

	test('uses app base for published assets when no CDN is configured', async () => {
		page.data.config.url = { app: '/garden/', app_assets: '/static/', luzzle_assets: '' }
		expect(await html()).toContain('src="/garden/pieces/assets/books/cover%20key/original.jpg"')
	})

	test('does not infer images from metadata when mapped template fields are empty', async () => {
		const current = piece()
		current.templates.icon.fields = {}
		const body = await html({ piece: current })
		expect(body).toContain('&lt;Piece>&amp;')
		expect(body).not.toContain('<img')
	})

	test('uses each new piece and mapped field value rather than a fallback snapshot', async () => {
		const current = piece('new-kind')
		current.title = 'Next <Piece>'
		current.templates.icon.fields.image = 'missing'
		const body = await html({ piece: current, size: { width: 200 }, active: true })
		expect(body).toContain('Next &lt;Piece>')
		expect(body).toContain('--piece-icon-width: 200px;')
		expect(body).toMatch(/class="poster [^"]*\bactive\b/)
		expect(body).not.toContain('<img')
	})
})
