import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { fileURLToPath } from 'node:url'
import { createServer, type ViteDevServer } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import type { Component, ComponentProps } from 'svelte'
import type { render as Render } from 'svelte/server'
import { createPieceHelpers, type PublicWebPiece } from '@luzzle/web.pieces'
import type DefaultPage from '@luzzle/web.templates/components/page.default.svelte'

type Props = ComponentProps<typeof DefaultPage>
let server: ViteDevServer
let Page: Component<Props>
let render: typeof Render

beforeAll(async () => {
	server = await createServer({
		configFile: false,
		root: fileURLToPath(new URL('../../../../', import.meta.url)),
		server: { middlewareMode: true, hmr: false },
		optimizeDeps: { noDiscovery: true },
		plugins: [svelte({ configFile: false, hot: false })]
	})
	// Compile the actual canonical raw body and its canonical icon, not fixture UI.
	Page = (await server.ssrLoadModule('@luzzle/web.templates/components/page.default.svelte'))
		.default
	render = (await server.ssrLoadModule('svelte/server')).render
})

afterAll(async () => {
	await server?.close()
})

function piece(overrides: Partial<PublicWebPiece> = {}): PublicWebPiece {
	return {
		id: 'default-piece',
		key: 'book-key',
		type: 'books',
		slug: 'book-source',
		title: 'Book_Source <Title>&',
		date_added: 1,
		date_consumed: Date.parse('2024-01-02T00:30:00Z'),
		note: 'Source note',
		summary: '<Description>&',
		metadata: { cover: 'cover', author: 'Not a default byline' },
		keywords: '[]',
		assets: [
			{
				asset_key: 'book-key',
				transformation: 'markdown',
				mime_type: 'text/html',
				content: '<p>Rendered <strong>note</strong> &amp; content</p>'
			},
			{
				asset_key: 'cover',
				transformation: 'image.s.avif',
				mime_type: 'image/avif',
				asset_path: 'covers/small cover.avif'
			},
			{
				asset_key: 'cover',
				transformation: 'image.s.jpg',
				mime_type: 'image/jpeg',
				asset_path: 'covers/small cover.jpg'
			},
			{
				asset_key: 'cover',
				transformation: 'palette',
				mime_type: 'application/json',
				content:
					'{"background":"#123456","titleText":"#abcdef","bodyText":"#fedcba","accent":"#654321"}'
			}
		],
		...overrides
	}
}

async function html(current = piece(), tags: Props['tags'] = []) {
	const helpers = createPieceHelpers(
		current.assets,
		(path) => `https://assets.example/${path.split('/').map(encodeURIComponent).join('/')}`,
		() => {
			throw new Error('The built-in body must not request navigation helpers')
		}
	)
	return (await render(Page, { props: { piece: current, tags, helpers } })).body
}

describe('canonical default page body SSR', () => {
	test('renders original title, escaped description and normalized tags without app navigation', async () => {
		const body = await html(piece(), [{ slug: 'reading', tag: 'READING<&' }])
		expect(body).toContain('id="main-content"')
		expect(body).toContain('Book_Source &lt;Title>&amp;')
		expect(body).toContain('&lt;Description>&amp;')
		expect(body).toContain('href="/tags/reading"')
		expect(body).toContain('#reading&lt;&amp;')
		expect(body).not.toContain('<Description>')
		expect(body).not.toContain('<nav')
		expect(body).not.toContain('Not a default byline')
	})

	test('renders transformed note HTML from the actual piece helpers', async () => {
		const body = await html()
		expect(body).toContain('<p>Rendered <strong>note</strong> &amp; content</p>')
		expect(body).not.toContain('Source note')
	})

	test('retains the raw note fallback when no rendered markdown asset exists', async () => {
		const body = await html(piece({ assets: [], note: 'Original <em>note</em>' }))
		expect(body).toContain('Original <em>note</em>')
	})

	test('renders the original empty note message even if a markdown asset exists', async () => {
		const body = await html(piece({ note: '' }))
		expect(body).toContain('this record does not have a note')
		expect(body).not.toContain('<strong>note</strong>')
	})

	test('formats only the consumed date in UTC with the original dotted byline', async () => {
		const body = await html()
		expect(body).toMatch(/<p class="byline [^"]*">1\.2\.2024<\/p>/)
		const undated = await html(piece({ date_consumed: undefined }))
		expect(undated).not.toContain('class="byline ')
		expect(undated).not.toContain('1.2.2024')
	})

	test('uses the helper palette for the hero, byline and border', async () => {
		const body = await html()
		expect(body).toContain('--hero-bg: #123456; --hero-title: #abcdef')
		expect(body).toContain('--byline-bg: #123456; --byline-text: #fedcba')
		expect(body).toContain('--byline-border: #654321;')
	})

	test('preserves theme fallbacks and omits absent supplemental details and tags', async () => {
		const body = await html(piece({ assets: [], metadata: {}, summary: undefined }))
		expect(body).toContain('--hero-bg: var(--color-surface-container)')
		expect(body).toContain('--hero-title: var(--color-on-surface)')
		expect(body).toContain('--byline-text: var(--color-on-surface-variant)')
		expect(body).toContain('--byline-border: var(--color-outline-variant)')
		expect(body).not.toContain('class="supplemental ')
		expect(body).not.toContain('tags-container')
	})

	test('renders an escaped URL in preference to ISBN, or the original ISBN search link', async () => {
		const url = 'https://example.test/?a=1&b="quoted"'
		const linked = await html(piece({ metadata: { url, isbn: '9781234567890' } }))
		expect(linked).toContain('href="https://example.test/?a=1&amp;b=&quot;quoted&quot;"')
		expect(linked).toContain('https://example.test/?a=1&amp;b="quoted"')
		expect(linked).not.toContain('openlibrary.org')
		const isbn = await html(piece({ metadata: { isbn: '9781234567890' } }))
		expect(isbn).toContain('href="https://openlibrary.org/search?isbn=9781234567890"')
		expect(isbn).toContain('isbn 9781234567890')
	})

	test('renders the canonical icon directly at width 125 with eager small transformed images', async () => {
		const body = await html()
		expect(body).toContain('class="default-icon ')
		expect(body).toContain('--piece-icon-scale: 0.33;')
		expect(body).toContain('--piece-icon-width: 125px;')
		expect(body).toContain('--piece-icon-height: 187.5px;')
		expect(body).toContain('srcset="https://assets.example/covers/small%20cover.avif"')
		expect(body).toContain('src="https://assets.example/covers/small%20cover.jpg"')
		expect(body).toContain('loading="eager" fetchpriority="high"')
		expect(body).not.toContain('loading="lazy"')
	})

	test.each(['image', 'poster'])(
		'retains the canonical icon %s and original image fallback',
		async (key) => {
			const body = await html(
				piece({
					metadata: { [key]: 'original' },
					assets: [
						{
							asset_key: 'original',
							transformation: 'image.original',
							mime_type: 'image/jpeg',
							asset_path: 'original.jpg'
						}
					]
				})
			)
			expect(body).toContain('src="https://assets.example/original.jpg"')
			expect(body).toContain('srcset="https://assets.example/original.jpg"')
		}
	)
})
