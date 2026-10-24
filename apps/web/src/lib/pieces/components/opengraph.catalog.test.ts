import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { fileURLToPath } from 'node:url'
import { createServer, type ViteDevServer } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import type { Component } from 'svelte'
import type { render as Render } from 'svelte/server'
import type { PublicWebPiece } from '@luzzle/web.pieces'
import type { TemplateConfig } from '@luzzle/web.templates/config'
import { mapPieceTemplates, type TemplatedPiece } from '@luzzle/web.templates/pieces/fields'

type OgMapping = NonNullable<
	NonNullable<TemplateConfig['pieces'][number]['templates']>['opengraph']
>['mapping']
let server: ViteDevServer
let Opengraph: Component<{ piece: TemplatedPiece }>
let render: typeof Render
let page: {
	data: {
		config: { url: { app: string; app_assets: string; luzzle_assets: string } }
		preview?: boolean
		job?: string
	}
}

beforeAll(async () => {
	server = await createServer({
		configFile: false,
		root: fileURLToPath(new URL('../../../../', import.meta.url)),
		server: { middlewareMode: true, hmr: false },
		optimizeDeps: { noDiscovery: true },
		plugins: [
			{
				name: 'og-test-page',
				enforce: 'pre',
				resolveId(id) {
					if (id === '$app/state') return '\0og-test-page'
				},
				load(id) {
					if (id === '\0og-test-page') return 'export const page = { data: {} }'
				}
			},
			svelte({ configFile: false, hot: false })
		],
		resolve: { alias: { $lib: fileURLToPath(new URL('../../', import.meta.url)) } }
	})
	Opengraph = (
		await server.ssrLoadModule(fileURLToPath(new URL('./opengraph.svelte', import.meta.url)))
	).default
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
				app: 'https://app.example',
				app_assets: '/static',
				luzzle_assets: 'https://assets.example'
			}
		}
	}
})

const mappings: Record<string, OgMapping> = {
	default: { image: 'art', director: 'creator' },
	book: { image: 'art', author: 'creator', pages: 'leaves' },
	poster: { image: 'art', director: 'creator', runtime: 'minutes' },
	'browser-window': { image: 'art', author: 'creator', url: 'website', wordCount: 'words' },
	'lined-notebook-paper': {},
	'recipe-card': {
		image: 'art',
		source: 'source',
		ingredients: { each: 'food', fields: { item: 'label' } },
		prepMinutes: 'prep',
		cookMinutes: 'cook'
	},
	'code-snippet': {
		files: { each: 'files', fields: { file: 'key', type: 'kind', format: 'language' } }
	},
	'playing-cards': { backdrop: 'art', publisher: 'source', playTimeMinutes: 'minutes' },
	'video-game-cartridge': {
		image: 'art',
		publisher: 'source',
		platform: 'platform',
		playTimeMinutes: 'minutes'
	},
	'vinyl-record': { image: 'art', artist: 'creator', durationSeconds: 'seconds' }
}

function piece(name: string): TemplatedPiece {
	const raw: PublicWebPiece = {
		id: 'one',
		key: 'one',
		type: 'inventory',
		slug: 'one',
		title: 'Mapped <Card>',
		note: 'Note',
		summary: '<Summary>',
		date_added: 1,
		metadata: {
			art: 'image-key',
			creator: 'Ada',
			leaves: 320,
			minutes: 90,
			words: 750,
			website: 'https://example.test/story',
			source: 'A source',
			platform: 'Console',
			seconds: 125,
			food: [{ label: '<Flour>', quantity: 2 }],
			prep: 2,
			cook: 10,
			files: [
				{ key: 'download-key', kind: 'attachment', language: 'text' },
				{ key: 'code-key', kind: 'snippet', language: 'javascript' }
			]
		},
		assets: [
			{
				asset_key: 'image-key',
				transformation: 'image.original',
				asset_path: 'one/cover image.png',
				mime_type: 'image/png'
			},
			{
				asset_key: 'code-key',
				transformation: 'highlight',
				content: '<pre data-highlight>code &amp; text</pre>',
				mime_type: 'text/html'
			}
		]
	}
	return mapPieceTemplates(raw, {
		type: raw.type,
		fields: { title: 'title', date_consumed: 'date' },
		templates: {
			icon: { name: 'playing-cards' },
			page: { name: 'note' },
			opengraph: { name, mapping: mappings[name] }
		}
	})
}

async function html(name: string) {
	return (await render(Opengraph, { props: { piece: piece(name) } })).body
}

describe('named OG preview catalog SSR', () => {
	test.each([
		['default', 'poster'],
		['book', 'book'],
		['poster', 'poster'],
		['browser-window', 'browser-container'],
		['lined-notebook-paper', 'paper'],
		['recipe-card', 'notepad'],
		['vinyl-record', 'vinyl-container'],
		['code-snippet', 'terminal-container'],
		['video-game-cartridge', 'cartridge-container'],
		['playing-cards', 'cards-container']
	])('%s produces useful HTML using its own graphic', async (name, marker) => {
		const body = await html(name)
		expect(body).toContain('width:1200px;height:630px;')
		expect(body).toContain('Mapped &lt;Card>')
		expect(body).toContain(`class="${marker} `)
		expect(body).not.toContain('<nav')
	})

	test('all pictured templates use current job-preview URLs without public fallback', async () => {
		for (const name of [
			'book',
			'poster',
			'browser-window',
			'recipe-card',
			'vinyl-record',
			'video-game-cartridge',
			'playing-cards'
		]) {
			page.data.preview = true
			page.data.job = 'preview one'
			const first = await html(name)
			expect(first).toContain('src="/admin/preview/preview%20one/asset/one/cover%20image.png"')
			expect(first).not.toContain('https://assets.example')
			page.data.job = 'preview two'
			expect(await html(name)).toContain('/admin/preview/preview%20two/asset/one/cover%20image.png')
		}
	})

	test('book data does not come from the selected icon or page', async () => {
		const body = await html('book')
		expect(body).toContain('by Ada')
		expect(body).toContain('320 pages')
		expect(body).toContain('src="https://assets.example/pieces/assets/one/cover%20image.png"')
		expect(body).not.toContain('cards-container')
	})

	test('ingredient names are escaped while code HTML comes only from highlight assets', async () => {
		const recipe = await html('recipe-card')
		expect(recipe).toContain('&lt;Flour>')
		expect(recipe).not.toContain('<Flour>')
		expect(recipe).toContain('12 min')
		const code = await html('code-snippet')
		expect(code).toContain('<pre data-highlight>code &amp; text</pre>')
	})
})
