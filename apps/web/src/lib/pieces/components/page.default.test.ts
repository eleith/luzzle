import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { fileURLToPath } from 'node:url'
import { createServer, type ViteDevServer } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import type { Component, ComponentProps } from 'svelte'
import type { render as Render } from 'svelte/server'
import { createPieceHelpers, type PublicWebPiece } from '@luzzle/web.pieces'
import type DefaultPage from '@luzzle/web.templates/pages/default'
import { mapPieceTemplates } from '@luzzle/web.templates/pieces/fields'
import type { TemplateConfig } from '@luzzle/web.templates/config'

type Props = ComponentProps<typeof DefaultPage>
type PageMapping = NonNullable<TemplateConfig['pieces'][number]['templates']>['page']['mapping']
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
	// Compile the actual shipped catalog and selected default, not a fixture or legacy adapter.
	Page = (await server.ssrLoadModule('@luzzle/web.templates/pages')).getPage('default')
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

async function html(
	current = piece(),
	tags: Props['tags'] = [],
	mapping: PageMapping = {
		image: 'cover',
		url: 'url',
		isbn: 'isbn',
		people: 'credits',
		category: 'category',
		backdrop: 'backdrop',
		dateReleased: 'released',
		runtime: 'runtime'
	}
) {
	const mapped = mapPieceTemplates(current, {
		type: current.type,
		fields: { title: 'title', date_consumed: 'date' },
		templates: {
			icon: { name: 'default', mapping: {} },
			page: { name: 'default', mapping },
			opengraph: { name: 'default', mapping: {} }
		}
	})
	const helpers = createPieceHelpers(
		current.assets,
		(path) => `https://assets.example/${path.split('/').map(encodeURIComponent).join('/')}`,
		() => {
			throw new Error('The built-in body must not request navigation helpers')
		}
	)
	return (
		await render(Page, {
			props: { piece: mapped, fields: mapped.templates.page.fields, tags, helpers }
		})
	).body
}

describe('canonical default page body SSR', () => {
	test('renders original title, escaped description and normalized tags without app navigation', async () => {
		const body = await html(piece(), [{ slug: 'reading', tag: 'READING<&' }])
		expect(body.match(/<main\b/g)).toHaveLength(1)
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

	test('uses the helper palette for the poster hero and border', async () => {
		const body = await html()
		expect(body).toContain('--poster-background-color: #123456; --poster-title-color: #abcdef')
		expect(body).toContain('--backdrop-accent: #654321')
		expect(body).toContain('--byline-border: #654321;')
	})

	test('preserves theme fallbacks and omits absent supplemental details and tags', async () => {
		const body = await html(piece({ assets: [], metadata: {}, summary: undefined }))
		expect(body).toContain('--poster-background-color: var(--color-surface-container)')
		expect(body).toContain('--poster-title-color: var(--color-on-surface)')
		expect(body).toContain('--byline-border: var(--color-outline-variant)')
		expect(body).not.toContain('class="supplemental ')
		expect(body).not.toContain('tags-container')
	})

	test('renders a normalized safe URL in preference to ISBN, or the original ISBN search link', async () => {
		const url = 'https://example.test/?a=1&b="quoted"'
		const linked = await html(piece({ metadata: { url, isbn: '9781234567890' } }))
		expect(linked).toContain('href="https://example.test/?a=1&amp;b=%22quoted%22"')
		expect(linked).toContain('https://example.test/?a=1&amp;b=%22quoted%22')
		expect(linked).not.toContain('openlibrary.org')
		const isbn = await html(piece({ metadata: { isbn: '9781234567890' } }))
		expect(isbn).toContain('href="https://openlibrary.org/search?isbn=9781234567890"')
		expect(isbn).toContain('isbn 9781234567890')
	})

	test('renders the independent poster at width 125 with eager small transformed images', async () => {
		const body = await html()
		expect(body).toContain('class="poster ')
		expect(body).toContain('--piece-icon-scale: 0.33;')
		expect(body).toContain('--piece-icon-width: 125px;')
		expect(body).toContain('--piece-icon-height: 187.5px;')
		expect(body).toContain('srcset="https://assets.example/covers/small%20cover.avif"')
		expect(body).toContain('src="https://assets.example/covers/small%20cover.jpg"')
		expect(body).toContain('loading="eager" fetchpriority="high"')
		expect(body).not.toContain('loading="lazy"')
	})

	test.each(['image', 'poster'])(
		'renders explicitly mapped %s metadata using original image fallback',
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
				}),
				[],
				{ image: key }
			)
			expect(body).toContain('src="https://assets.example/original.jpg"')
			expect(body).toContain('srcset="https://assets.example/original.jpg"')
		}
	)
	test('does not guess images or supplemental fields from unmapped metadata', async () => {
		const body = await html(
			piece({
				metadata: {
					cover: 'cover',
					image: 'cover',
					poster: 'cover',
					url: 'https://not-mapped.test'
				}
			}),
			[],
			{}
		)
		expect(body).not.toContain('<img')
		expect(body).not.toContain('not-mapped.test')
	})

	test('renders actual mapped people, category and release/runtime byline', async () => {
		const body = await html(
			piece({
				metadata: {
					credits: ['Ada', { name: 'Grace <Hopper>' }],
					category: 'A <category>',
					released: '2020-01-01',
					runtime: 99
				}
			})
		)
		expect(body).toContain('Ada, Grace &lt;Hopper>')
		expect(body).toContain('A &lt;category>')
		expect(body).toContain('2020 · 99 min · 1.2.2024')
	})

	test('rejects unsafe mapped external links without losing ISBN fallback', async () => {
		const body = await html(
			piece({ metadata: { url: 'javascript:alert(1)', isbn: '9781234567890' } })
		)
		expect(body).not.toContain('javascript:')
		expect(body).toContain('href="https://openlibrary.org/search?isbn=9781234567890"')
	})
})
