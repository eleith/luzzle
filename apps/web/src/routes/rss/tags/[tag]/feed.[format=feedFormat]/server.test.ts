import { beforeEach, expect, test, vi } from 'vitest'
import { parseRssFeed } from 'feedsmith'
import { siteImageDefaults, validateConfig } from '@luzzle/web.config'
import { config } from '#lib/server/config.js'
import { GET } from './+server'

const { getPiecesForTagFeed } = vi.hoisted(() => ({ getPiecesForTagFeed: vi.fn() }))
vi.mock('#lib/server/config.js', async () => {
	const { makeConfig } = await import('#lib/server/config.fixture.js')
	const base = makeConfig()
	return {
		config: {
			...base,
			content: {
				...base.content,
				text: { title: 'Garden', description: 'Field observations' }
			},
			url: { ...base.url, app: 'https://app.example', app_assets: '/static' }
		}
	}
})
vi.mock('#lib/feeds/utils.js', () => ({ getPiecesForTagFeed }))

function event(format = 'xml', tag = 'field-notes') {
	return {
		params: { tag, format },
		url: new URL('https://request.test/rss/tags/field-notes/feed.xml')
	} as Parameters<typeof GET>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	config.content.images = validateConfig({}, {}).content.images
	config.content.text.title = 'Garden'
	config.url.app = 'https://app.example'
	config.url.app_assets = '/static'
	getPiecesForTagFeed.mockResolvedValue([
		{
			id: 'note',
			type: 'books',
			slug: 'observation',
			title: 'Observation',
			note: 'A field note',
			date_added: 1700000000000
		}
	])
})

test.each([
	['xml', 'application/xml'],
	['json', 'application/json'],
	['md', 'text/markdown']
])('%s retains tag feed content and type', async (format, contentType) => {
	const response = await GET(event(format))
	expect(response.status).toBe(200)
	expect(response.headers.get('content-type')).toBe(contentType)
	const body = await response.text()
	expect(body).toContain('Observation')
	expect(body).toContain('Garden | tag: field-notes')
	expect(getPiecesForTagFeed).toHaveBeenCalledExactlyOnceWith('field-notes')
})

test.each([
	[undefined, 'https://app.example/static/images/opengraph.png'],
	[{}, 'https://app.example/static/images/opengraph.png'],
	[siteImageDefaults, 'https://app.example/static/images/opengraph.png'],
	[{ favicon: siteImageDefaults.favicon }, 'https://app.example/static/images/opengraph.png'],
	[{ opengraph: siteImageDefaults.opengraph }, 'https://app.example/static/images/opengraph.png'],
	[{ favicon: '/private/icon.svg' }, 'https://app.example/static/images/opengraph.png'],
	[{ opengraph: '/private/card.webp' }, 'https://app.example/assets/opengraph/card.webp'],
	[
		{ favicon: '/private/icon.svg', opengraph: '/private/card.webp' },
		'https://app.example/assets/opengraph/card.webp'
	]
] as const)('XML channel image resolves independently for %j', async (images, image) => {
	config.content.images = validateConfig(images ? { content: { images } } : {}, {}).content.images
	const xml = await (await GET(event())).text()
	expect(parseRssFeed(xml).image).toMatchObject({ url: image, link: config.url.app })
	expect(xml).toContain('https://app.example/pieces/books/observation')
	expect(xml).not.toMatch(/private|icon.svg|assets\/favicon/)
})

test.each(['', '/garden', '//relative.example/garden'])(
	'XML image uses request origin for app URL %j',
	async (app) => {
		config.url.app = app
		config.content.images = validateConfig(
			{ content: { images: { opengraph: '/private/card.png' } } },
			{}
		).content.images
		const xml = await (await GET(event())).text()
		expect(xml).toContain('<url>https://request.test/assets/opengraph/card.png</url>')
	}
)

test('XML retains an absolute asset prefix and escapes text and image URLs', async () => {
	config.url.app_assets = 'https://assets.example/a&b'
	config.content.text.title = 'Garden & <Notes>'
	const xml = await (await GET(event())).text()
	expect(parseRssFeed(xml).image?.url).toBe('https://assets.example/a&b/images/opengraph.png')
	expect(xml).toContain('<![CDATA[https://assets.example/a&b/images/opengraph.png]]>')
	expect(parseRssFeed(xml).image?.title).toBe('Garden & <Notes>')
})
