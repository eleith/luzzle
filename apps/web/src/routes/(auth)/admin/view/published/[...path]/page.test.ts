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
		route: { id: '/(auth)/admin/view/published/[...path]' },
		data: { config: { url: { app: '/garden', luzzle_assets: '/cdn' } } }
	}
}))
vi.mock('$app/state', () => ({ page }))
vi.mock('$app/forms', () => ({ enhance: vi.fn() }))
vi.mock('$app/paths', () => ({
	resolve: (route: string, params?: { path?: string; tag?: string }) => {
		if (route === '/tags/[tag]') return `/tags/${params?.tag}`
		return route.replace('/(auth)', '').replace('[...path]', () => params?.path ?? '')
	}
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
	page.route.id = '/(auth)/admin/view/published/[...path]'
})

test('overview shows the published snapshot, recorded completion time and public destinations', () => {
	const data = publishedData()

	const html = render(Overview, { props: { data, params: { path: data.file } } }).body

	expect(html).toContain('Published &lt;Book>')
	expect(html).toContain('datetime="2026-11-01T12:00:00.000Z"')
	expect(html).toContain('data-status="matching"')
	expect(html).not.toMatch(/<form\b/)
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
	expect(html).toMatch(/Unpublished\s+changes/)
	const forms = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g) ?? []
	expect(forms).toHaveLength(1)
	expect(forms[0]).toContain('method="post"')
	expect(forms[0]).toContain('action="/admin/piece/books/draft%20%23%3F.books.md/preview"')
	expect(forms[0]?.replace(/<!--[\s\S]*?-->/g, '')).toMatch(
		/<button\b[^>]*type="submit"[^>]*>\s*Generate\s*<\/button>/
	)
	expect(html).not.toContain('Matches publish')
	expect(html).toContain('datetime="2026-11-01T12:00:00.000Z"')
	expect(html).toContain(`href="${data.publishedUrl}"`)
})

test('missing publication evidence remains unknown rather than using source dates', () => {
	const data = publishedData()
	data.publication = { lastPublishedAt: null, markdownStatus: MarkdownPublicationStatus.UNKNOWN }

	const html = render(Overview, { props: { data, params: { path: data.file } } }).body

	expect(html).toContain('data-status="unknown"')
	expect(html).not.toMatch(/<form\b/)
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

test.each(['page', 'icon'] as const)(
	'the %s route server-renders a loading state and no-JavaScript notice, not the composition',
	(view) => {
		const data = publishedData()
		page.route.id = `/(auth)/admin/view/published/[...path]/${view}`

		const html = render(PublishedTree, { props: { data, view } }).body

		expect(html).toContain(`role="status">Loading ${view} preview…`)
		expect(html).toContain('<noscript>')
		expect(html).toContain(`JavaScript is required to display the ${view} preview.`)
		expect(html).not.toContain('Published &lt;Book>')
		expect(html).not.toContain('href="/tags/fiction"')
		expect(html.match(/<main\b/g)).toHaveLength(1)
	}
)

function shareHtml(data = publishedData()) {
	page.route.id = '/(auth)/admin/view/published/[...path]/share'
	page.data.config = data.config
	return render(PublishedTree, { props: { data, view: 'share' } }).body
}

test.each(['/cdn', ''])('Share links the recorded PNG using the asset base %j', (assetBase) => {
	const data = publishedData()
	data.config.url.luzzle_assets = assetBase
	const html = shareHtml(data)
	const url = `${assetBase || '/garden'}/pieces/assets/generated/share.png?v=${data.publication.lastPublishedAt}`

	expect(html).toContain(`src="${url}"`)
	expect(html).toContain(`href="${url}" target="_blank" rel="external noopener noreferrer"`)
	expect(html).toContain('alt="Share image for Published &lt;Book>"')
	expect(html.match(/<main\b/g)).toHaveLength(1)
	expect(html.match(/<img\b/g)).toHaveLength(1)
	expect(html).not.toContain('/admin/preview/')
})

test('republishing versions both the image and inspection link without changing the asset path', () => {
	const data = publishedData()
	const assetUrl = '/cdn/pieces/assets/generated/share.png'
	for (const publishedAt of [1000, 2000, null]) {
		data.publication.lastPublishedAt = publishedAt
		const html = shareHtml(data)
		const url = publishedAt === null ? assetUrl : `${assetUrl}?v=${publishedAt}`
		expect(html).toContain(`src="${url}"`)
		expect(html).toContain(`href="${url}" target="_blank"`)
	}
})

test.each([undefined, '../private.png'])(
	'Share does not invent an image for unavailable path %j',
	(path) => {
		const data = publishedData()
		data.piece.assets.find((asset) => asset.transformation === 'opengraph')!.asset_path = path
		const html = shareHtml(data)

		expect(html).toContain('No generated share image is available.')
		expect(html).not.toMatch(/<img\b|private\.png|data-renderer=/)
	}
)
