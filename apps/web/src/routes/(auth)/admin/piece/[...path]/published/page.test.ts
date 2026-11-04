import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { ComponentProps } from 'svelte'
import { MarkdownPublicationStatus } from '#lib/pieces/types.js'
import { makePublicConfig } from '#lib/server/config.fixture.js'
import { publishedPiece as originalPiece, asset } from '#lib/pieces/viewer/fixtures/published.js'
import Overview from './+page.svelte'
import PublishedTree from './fixtures/PublishedTree.svelte'

const { page } = vi.hoisted(() => ({
	page: {
		route: { id: '/(auth)/admin/piece/[...path]/published' },
		data: { config: { url: { app: '/garden', luzzle_assets: '/cdn' } } }
	}
}))
vi.mock('$app/state', () => ({ page }))
vi.mock('$app/paths', () => ({
	resolve: (route: string, params?: { path?: string; tag?: string }) => {
		if (route === '/tags/[tag]') return `/tags/${params?.tag}`
		return route.replace('/(auth)', '').replace('[...path]', () => params?.path ?? '')
	}
}))
vi.mock('#lib/pieces/components/page.svelte', async () => ({
	default: (await import('#lib/pieces/viewer/fixtures/PageRenderer.svelte')).default
}))
vi.mock('#lib/pieces/components/icon.svelte', async () => ({
	default: (await import('#lib/pieces/viewer/fixtures/IconRenderer.svelte')).default
}))
vi.mock('#lib/pieces/components/opengraph.svelte', async () => ({
	default: (await import('#lib/pieces/viewer/fixtures/Composition.svelte')).default
}))

function publishedData(): ComponentProps<typeof Overview>['data'] {
	return {
		pieceTypes: ['books'],
		file: 'books/draft #?.books.md',
		piece: {
			...originalPiece,
			templates: {
				icon: { name: 'default', fields: { image: 'cover' } },
				page: { name: 'default', fields: { image: 'cover' } },
				opengraph: { name: 'default', fields: { image: 'cover' } }
			},
			assets: [
				...originalPiece.assets,
				asset('opengraph', 'generated/share.png', 'piece', 'image/png')
			]
		},
		tags: [{ slug: 'fiction', tag: 'Fiction' }],
		publication: {
			lastPublishedAt: Date.UTC(2026, 10, 1, 12),
			markdownStatus: MarkdownPublicationStatus.MATCHING
		},
		publishedUrl: 'https://public.test/pieces/books/published-book',
		config: makePublicConfig({
			url: { app: '/garden', app_assets: '/static', luzzle_assets: '/cdn' }
		}),
		meta: { title: 'Garden', description: 'Description' }
	}
}

beforeEach(() => {
	page.route.id = '/(auth)/admin/piece/[...path]/published'
})

test('overview shows the published snapshot, recorded completion time and public destinations', () => {
	const data = publishedData()

	const html = render(Overview, { props: { data, params: { path: data.file } } }).body

	expect(html).toContain('Published &lt;Book>')
	expect(html).toContain('datetime="2026-11-01T12:00:00.000Z"')
	expect(html).toContain('data-status="matching"')
	expect(html).toContain(`href="${data.publishedUrl}"`)
	expect(html).toContain('href="/cdn/pieces/assets/generated/share.png"')
	expect(html).not.toContain('/admin/preview/')
	expect(html.match(/<main\b/g)).toHaveLength(1)
})

test('uses the app base when no asset CDN is configured', () => {
	const data = publishedData()
	data.config.url.luzzle_assets = ''

	const html = render(Overview, {
		props: { data, params: { path: data.file } }
	}).body

	expect(html).toContain('href="/garden/pieces/assets/generated/share.png"')
})

test('unpublished changes do not hide the previous publication or claim it matches the source', () => {
	const data = publishedData()
	data.publication.markdownStatus = MarkdownPublicationStatus.CHANGED

	const html = render(Overview, { props: { data, params: { path: data.file } } }).body

	expect(html).toContain('data-status="changed"')
	expect(html).toContain('Unpublished changes')
	expect(html).not.toContain('Matches publish')
	expect(html).toContain('datetime="2026-11-01T12:00:00.000Z"')
	expect(html).toContain(`href="${data.publishedUrl}"`)
})

test('missing publication evidence remains unknown rather than using source dates', () => {
	const data = publishedData()
	data.publication = { lastPublishedAt: null, markdownStatus: MarkdownPublicationStatus.UNKNOWN }

	const html = render(Overview, { props: { data, params: { path: data.file } } }).body

	expect(html).toContain('data-status="unknown"')
	expect(html).toContain('Unknown')
	expect(html).not.toMatch(/<time\b/)
})

test('the reset layout retains configured branding and noindex without adding public SEO', () => {
	const data = publishedData()
	data.config.content.images.favicon = '/assets/favicon/custom.svg'

	const result = render(PublishedTree, { props: { data } })

	expect(result.head).toContain('rel="icon" href="/assets/favicon/custom.svg"')
	expect(result.head).toContain('Published: Published &lt;Book>')
	expect(result.head).toContain('name="robots" content="noindex"')
	expect(result.head).not.toContain('property="og:')
	expect(result.head).not.toContain('name="description"')
	expect(result.body).toContain('href="/admin/piece/books/draft%20%23%3F.books.md/source"')
})

test.each([
	{ view: 'page', marker: 'data-renderer="page"' },
	{ view: 'icon', marker: 'data-renderer="icon"' },
	{ view: 'share', marker: 'data-renderer="composition"' }
] as const)('the $view route delegates the published piece to its renderer', ({ view, marker }) => {
	const data = publishedData()
	page.route.id = `/(auth)/admin/piece/[...path]/published/${view}`

	const html = render(PublishedTree, { props: { data, view } }).body

	expect(html).toContain(marker)
	expect(html).toContain('Published &lt;Book>')
	expect(html.match(/<main\b/g)).toHaveLength(1)
	if (view === 'page') {
		expect(html).toContain('href="/tags/fiction"')
		expect(html).toContain('Fiction')
	}
	if (view === 'share') expect(html).not.toContain('generated/share.png')
})
