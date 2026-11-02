import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { AppConfigPublic } from '#lib/server/config.js'
import { makeConfig } from '#lib/server/config.fixture.js'
import { siteImageUrls } from '#lib/server/site-images.js'
import SeoHead from './SeoHead.svelte'

const { page } = vi.hoisted(() => ({
	page: {
		data: {} as Partial<App.PageData>,
		url: new URL('https://request.test/pieces/books/book')
	}
}))
vi.mock('$app/state', () => ({ page }))
vi.mock('$app/env', () => ({ browser: false }))

function configuration(appAssets = '/static', app = 'https://public.test'): AppConfigPublic {
	const config = makeConfig()
	config.url = { app, app_assets: appAssets, luzzle_assets: '/pieces-cdn' }
	return {
		content: {
			text: { title: 'Garden', description: 'A garden' },
			images: siteImageUrls(config, page.url)
		},
		url: config.url
	}
}

beforeEach(() => {
	page.url = new URL('https://request.test/pieces/books/book')
	page.data = { config: configuration() }
})

test.each([
	['', '/images/favicon.png', 'https://public.test/images/opengraph.png'],
	['/static', '/static/images/favicon.png', 'https://public.test/static/images/opengraph.png'],
	['/static/', '/static/images/favicon.png', 'https://public.test/static/images/opengraph.png'],
	[
		'https://cdn.test/static',
		'https://cdn.test/static/images/favicon.png',
		'https://cdn.test/static/images/opengraph.png'
	]
])('consumes server-resolved bundled images with asset prefix %j', (prefix, favicon, image) => {
	page.data.config = configuration(prefix)
	const { head } = render(SeoHead)
	expect(head).toContain(`rel="icon" href="${favicon}"`)
	expect(head).toContain(`property="og:image" content="${image}"`)
	expect(head).toContain('property="og:url" content="https://request.test/pieces/books/book"')
})

test.each([
	['/static/images/favicon.png', 'https://public.test/static/images/opengraph.png'],
	['/site-assets/favicon', 'https://public.test/static/images/opengraph.png'],
	['/static/images/favicon.png', 'https://public.test/site-assets/opengraph'],
	['/site-assets/favicon', 'https://public.test/site-assets/opengraph']
])('consumes resolved favicon %s and OG %s independently', (favicon, opengraph) => {
	const config = configuration()
	config.content.images = { favicon, opengraph }
	page.data.config = config
	const { head } = render(SeoHead)
	expect(head).toContain(`rel="icon" href="${favicon}"`)
	expect(head).toContain(`property="og:image" content="${opengraph}"`)
	expect(head.match(/rel="icon"/g)).toHaveLength(1)
	expect(head.match(/property="og:image"/g)).toHaveLength(1)
	expect(head).not.toContain('/pieces-cdn/')
})

test.each(['', '/garden'])('consumes server-resolved OG for relative app base %j', (app) => {
	page.data.config = configuration('/static', app)
	expect(render(SeoHead).head).toContain(
		'property="og:image" content="https://request.test/static/images/opengraph.png"'
	)
})

test.each([
	'/pieces/assets/book/share.png',
	'https://pieces.test/pieces/assets/book/share%20image.png'
])('piece OG %j retains priority and is not absolutized or rewritten', (image) => {
	const config = configuration()
	config.content.images = {
		favicon: '/site-assets/favicon',
		opengraph: 'https://public.test/site-assets/opengraph'
	}
	page.data = { config, meta: { title: 'Book | Garden', image } }
	const { head } = render(SeoHead)
	expect(head).toContain(`property="og:image" content="${image}"`)
	expect(head).toContain('rel="icon" href="/site-assets/favicon"')
	expect(head).not.toContain('site-assets/opengraph')
	expect(head).toContain('<title>Book | Garden</title>')
})

test('head escapes metadata and resolved image URLs', () => {
	const config = configuration()
	config.content.images = {
		favicon: '/site-assets/favicon?a=1&b="icon"',
		opengraph: 'https://public.test/site-assets/opengraph?a=1&b=2'
	}
	page.data = { config, meta: { title: '<Book> & Garden', description: 'A "quote" & detail' } }
	const { head } = render(SeoHead)
	expect(head).toContain('<title>&lt;Book> &amp; Garden</title>')
	expect(head).toContain('content="A &quot;quote&quot; &amp; detail"')
	expect(head).toContain('href="/site-assets/favicon?a=1&amp;b=&quot;icon&quot;"')
	expect(head).toContain('content="https://public.test/site-assets/opengraph?a=1&amp;b=2"')
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
