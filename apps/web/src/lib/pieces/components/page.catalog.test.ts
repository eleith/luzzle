import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { fileURLToPath } from 'node:url'
import { createServer, type ViteDevServer } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import type { Component } from 'svelte'
import type { render as Render } from 'svelte/server'
import {
	createPieceHelpers,
	type PieceComponentHelpers,
	type PublicWebPiece
} from '@luzzle/web.pieces'
import { mapPieceTemplates, type PieceTemplateData } from '@luzzle/web.templates/pieces/fields'
import type { TemplateConfig } from '@luzzle/web.templates/config'

type Props = {
	piece: PublicWebPiece
	fields: PieceTemplateData['page']['fields']
	tags: Array<{ slug: string; tag: string }>
	helpers: PieceComponentHelpers
}
type PageMapping = NonNullable<TemplateConfig['pieces'][number]['templates']>['page']['mapping']
let server: ViteDevServer
let render: typeof Render
let getPage: (name?: string) => Component<Props>

beforeAll(async () => {
	server = await createServer({
		configFile: false,
		cacheDir: fileURLToPath(
			new URL('../../../../node_modules/.cache/catalog-pages', import.meta.url)
		),
		root: fileURLToPath(new URL('../../../../', import.meta.url)),
		server: { middlewareMode: true, hmr: false },
		optimizeDeps: { noDiscovery: true },
		plugins: [svelte({ configFile: false })],
		resolve: { alias: { '#lib': fileURLToPath(new URL('../../', import.meta.url)) } }
	})
	getPage = (await server.ssrLoadModule('@luzzle/web.templates/pages')).getPage
	render = (await server.ssrLoadModule('svelte/server')).render
})
afterAll(async () => {
	await server?.close()
})

function source(metadata: PublicWebPiece['metadata'] = {}): PublicWebPiece {
	return {
		id: 'one',
		key: 'one',
		type: 'inventory',
		slug: 'one',
		title: 'Mapped <Record>',
		note: 'Raw note',
		summary: 'Summary',
		keywords: '["puzzle"]',
		date_added: 1,
		date_consumed: Date.UTC(2025, 0, 2),
		metadata,
		assets: [
			{
				asset_key: 'one',
				transformation: 'markdown',
				content: '<p>Rendered note</p>',
				mime_type: 'text/html'
			},
			{
				asset_key: 'image-key',
				transformation: 'image.original',
				asset_path: 'page cover.jpg',
				mime_type: 'image/jpeg'
			},
			{
				asset_key: 'code-key',
				transformation: 'highlight',
				content: '<pre data-highlight>code &amp; text</pre>',
				mime_type: 'text/html'
			},
			{
				asset_key: 'code-key',
				transformation: 'attachment',
				asset_path: 'source example.js',
				mime_type: 'text/javascript'
			},
			{
				asset_key: 'attachment-key',
				transformation: 'attachment',
				asset_path: 'data example.csv',
				mime_type: 'text/csv'
			}
		]
	}
}

function props(
	name: string,
	metadata: PublicWebPiece['metadata'] = {},
	mapping: PageMapping = {}
): Props {
	const piece = source(metadata)
	const mapped = mapPieceTemplates(piece, {
		type: piece.type,
		fields: { title: 'title', date_consumed: 'date' },
		templates: {
			icon: { name: 'playing-cards' },
			page: { name, mapping },
			opengraph: { name: 'default' }
		}
	})
	return {
		piece: mapped,
		fields: mapped.templates.page.fields,
		tags: [{ slug: 'a tag', tag: 'A TAG' }],
		helpers: createPieceHelpers(
			piece.assets,
			(path) => 'https://assets.example/' + path.split('/').map(encodeURIComponent).join('/'),
			() => 'https://app.example/pieces/inventory/one'
		)
	}
}

async function html(
	name: string,
	metadata: PublicWebPiece['metadata'] = {},
	mapping: PageMapping = {}
) {
	return (await render(getPage(name), { props: props(name, metadata, mapping) })).body
}

describe('named page catalog SSR', () => {
	test.each([
		'book',
		'film',
		'article',
		'note',
		'recipe',
		'music',
		'snippet',
		'video-game',
		'tabletop-game'
	])(
		'%s renders useful escaped HTML and normalized note content without app chrome',
		async (name) => {
			const body = await html(name)
			expect(body).toContain('Mapped &lt;Record>')
			expect(body).toContain('<p>Rendered note</p>')
			expect(body).not.toContain('<nav')
			expect(body).toContain('href="/tags/a%20tag"')
		}
	)

	test('book/film fields are separate from the selected icon and remain template-specific', async () => {
		const book = await html(
			'book',
			{ maker: 'Ada', leaves: 320, year: 2001, cover: 'image-key' },
			{
				author: 'maker',
				pages: 'leaves',
				publicationYear: 'year',
				image: 'cover'
			}
		)
		expect(book).toContain('by Ada · 320 pages · 1.2.2025')
		expect(book).toContain('2001')
		expect(book).toContain('class="book ')
		expect(book).not.toContain('cards-container')
		expect(book).toContain('page%20cover.jpg')
		const film = await html(
			'film',
			{ released: '2024-01-01', minutes: 90, cast: [{ label: 'Grace' }] },
			{
				dateReleased: 'released',
				runtime: 'minutes',
				people: { each: 'cast', fields: { name: 'label' } }
			}
		)
		expect(film).toContain('2024 · 90 min · 1.2.2025')
		expect(film).toContain('Grace')
	})

	test('article link status and reading time use normalized fields', async () => {
		const body = await html(
			'article',
			{ author: 'Ada', words: 750, destination: 'https://example.test/story' },
			{
				author: 'author',
				wordCount: 'words',
				url: 'destination'
			}
		)
		expect(body).toContain('by Ada · 3 min')
		expect(body).toContain('href="https://example.test/story"')
		const blocked = await html(
			'article',
			{ destination: 'https://example.test/story', online: false },
			{ url: 'destination', isActive: 'online' }
		)
		expect(blocked).toContain('dead link')
		expect(blocked).toContain('href="https://example.test/story"')
	})

	test('recipe preserves authored instruction HTML while explicit text stays escaped', async () => {
		const body = await html(
			'recipe',
			{
				items: [{ label: 'Flour', amount: '1/2', measure: 'cup' }],
				steps: [{ text: '<em>plain</em>' }, { html: '<strong>rich</strong>' }],
				prep: 2,
				cook: 10
			},
			{
				ingredients: {
					each: 'items',
					fields: { item: 'label', quantity: 'amount', unit: 'measure' }
				},
				instructions: 'steps',
				prepMinutes: 'prep',
				cookMinutes: 'cook'
			}
		)
		expect(body).toContain('Flour')
		expect(body).toContain('1/2')
		expect(body).toContain('&lt;em>plain&lt;/em>')
		expect(body).toContain('<strong>rich</strong>')
		expect(body).toContain('1 ingredients · 12m')
	})

	test('two recipe instances have distinct native checkbox IDs and matching labels', async () => {
		const Pair = (
			await server.ssrLoadModule(
				fileURLToPath(new URL('./fixtures/RecipePair.svelte', import.meta.url))
			)
		).default
		const value = props('recipe', { items: [{ item: 'Flour' }] }, { ingredients: 'items' })
		const body = (await render(Pair, { props: { props: value } })).body
		const ids = [...body.matchAll(/<input[^>]*id="([^"]+)"/g)].map((match) => match[1])
		expect(ids).toHaveLength(2)
		expect(new Set(ids).size).toBe(2)
		for (const id of ids) expect(body).toContain(`for="${id}"`)
	})

	test('music produces safe encoded service links, normalized duration and no broken cover', async () => {
		const body = await html(
			'music',
			{
				artist: 'Ada',
				seconds: 59.6,
				video: 'a/b?c',
				bad: 'javascript:alert(1)',
				cover: 'missing'
			},
			{
				artist: 'artist',
				durationSeconds: 'seconds',
				youtubeId: 'video',
				appleMusicUrl: 'bad',
				image: 'cover'
			}
		)
		expect(body).toContain('by Ada · 1:00')
		expect(body).toContain('href="https://music.youtube.com/watch?v=a%2Fb%3Fc"')
		expect(body).not.toContain('javascript:')
		expect(body).not.toContain('<picture')
	})

	test('snippet retains duplicate labels, generated highlights and attachment links', async () => {
		const body = await html(
			'snippet',
			{
				sources: [
					{ key: 'code-key', label: 'same.js', language: 'javascript', kind: 'snippet' },
					{ key: 'attachment-key', label: 'same.js', language: 'csv', kind: 'attachment' }
				]
			},
			{
				files: {
					each: 'sources',
					fields: { file: 'key', name: 'label', format: 'language', type: 'kind' }
				}
			}
		)
		expect(body.match(/same\.js/g)?.length).toBeGreaterThanOrEqual(2)
		expect(body).toContain('<pre data-highlight>code &amp; text</pre>')
		expect(body).toContain('source%20example.js')
		expect(body).toContain('data%20example.csv')
		expect(body).toContain('2 files')
	})

	test('video and tabletop games have different bylines and detail sections', async () => {
		const video = await html(
			'video-game',
			{ platform: 'Console', minutes: 90 },
			{ platform: 'platform', playTimeMinutes: 'minutes' }
		)
		expect(video).toContain('Console')
		expect(video).toContain('2 hrs')
		const tabletop = await html(
			'tabletop-game',
			{ players: 2, minutes: 90 },
			{ playerCount: 'players', playTimeMinutes: 'minutes' }
		)
		expect(tabletop).toContain('2 players')
		expect(tabletop).toContain('90 min')
		expect(tabletop).not.toContain('Console')
	})
})
