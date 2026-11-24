import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import { makePublicConfig } from '#lib/server/config.fixture.js'
import SeoHead from './SeoHead.svelte'

const { page } = vi.hoisted(() => ({
	page: {
		data: {} as Partial<App.PageData>,
		url: new URL('https://request.test/pieces/books/book')
	}
}))
vi.mock('$app/state', () => ({ page }))
vi.mock('$app/env', () => ({ browser: false }))

beforeEach(() => {
	page.url = new URL('https://request.test/pieces/books/book')
	page.data = { config: makePublicConfig() }
})

test('renders the site images and request URL', () => {
	const config = makePublicConfig()
	config.content.images = { favicon: '/site-icon.svg', opengraph: 'https://cdn.test/site.png' }
	page.data.config = config
	const { head } = render(SeoHead)
	expect(head).toContain('rel="icon" href="/site-icon.svg"')
	expect(head).toContain('property="og:image" content="https://cdn.test/site.png"')
	expect(head).toContain(`property="og:url" content="${page.url.href}"`)
})

test('piece image overrides the site image without rewriting its URL', () => {
	page.data.meta = { title: 'Book', image: '/book/share.png' }
	const { head } = render(SeoHead)
	expect(head).toContain('property="og:image" content="/book/share.png"')
	expect(head.match(/property="og:image"/g)).toHaveLength(1)
})

test('head escapes metadata and resolved image URLs', () => {
	const config = makePublicConfig()
	config.content.images = {
		favicon: '/assets/favicon/selected-icon.svg?a=1&b="icon"',
		opengraph: 'https://public.test/assets/opengraph/selected-card.png?a=1&b=2'
	}
	page.data = { config, meta: { title: '<Book> & Garden', description: 'A "quote" & detail' } }
	const { head } = render(SeoHead)
	expect(head).toContain('<title>&lt;Book> &amp; Garden</title>')
	expect(head).toContain('content="A &quot;quote&quot; &amp; detail"')
	expect(head).toContain('href="/assets/favicon/selected-icon.svg?a=1&amp;b=&quot;icon&quot;"')
	expect(head).toContain(
		'content="https://public.test/assets/opengraph/selected-card.png?a=1&amp;b=2"'
	)
})

test('absent root layout data renders safely without inventing site-image selections', () => {
	page.data = {}
	page.url = new URL('https://request.test:8443/missing')
	const { head } = render(SeoHead)
	expect(head).toContain('<title>Luzzle Explorer</title>')
	expect(head).not.toContain('rel="icon"')
	expect(head).not.toContain('property="og:image"')
	expect(head).not.toMatch(/undefined|null|private/)
})
