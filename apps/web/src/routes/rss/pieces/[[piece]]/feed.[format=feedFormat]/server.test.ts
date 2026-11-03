import { beforeEach, expect, test, vi } from 'vitest'
import { parseRssFeed } from 'feedsmith'
import { siteImageDefaults, validateConfig } from '@luzzle/web.config'
import { config } from '#lib/server/config.js'
import { GET } from './+server'

const { getPiecesForFeed } = vi.hoisted(() => ({ getPiecesForFeed: vi.fn() }))
vi.mock('#lib/server/config.js', async () => {
	const { makeConfig } = await import('#lib/server/config.fixture.js')
	const base = makeConfig()
	return {
		config: {
			...base,
			pieces: [{ type: 'field-notes' }, { type: 'specimens' }],
			content: {
				...base.content,
				text: { title: 'Garden', description: 'Field observations' }
			},
			url: { ...base.url, app: 'https://app.example', app_assets: 'https://assets.example' }
		}
	}
})
vi.mock('#lib/feeds/utils.js', () => ({ getPiecesForFeed }))

function event(type: string | undefined, format: string) {
	return {
		params: { piece: type, format },
		url: new URL('https://request.test/rss/pieces/feed.xml')
	} as Parameters<typeof GET>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	config.content.images = validateConfig({}, {}).content.images
	config.url.app = 'https://app.example'
	config.url.app_assets = 'https://assets.example'
	getPiecesForFeed.mockResolvedValue([
		{
			id: 'note',
			type: config.pieces[0].type,
			slug: 'observation',
			title: 'Observation',
			note: 'A field note',
			date_added: 1700000000000
		}
	])
})

const formats = [
	['json', 'application/json'],
	['xml', 'application/xml'],
	['md', 'text/markdown']
] as const

test.each(formats)('%s feeds accept every runtime-configured type', async (format, contentType) => {
	for (const { type } of config.pieces) {
		const response = await GET(event(type, format))
		expect(response.status).toBe(200)
		expect(response.headers.get('content-type')).toBe(contentType)
		expect(await response.text()).toContain('Observation')
		expect(getPiecesForFeed).toHaveBeenLastCalledWith(type)
	}
})

test.each(formats)('%s feeds still support all pieces', async (format, contentType) => {
	const response = await GET(event(undefined, format))
	expect(response.status).toBe(200)
	expect(response.headers.get('content-type')).toBe(contentType)
	expect(getPiecesForFeed).toHaveBeenCalledExactlyOnceWith(undefined)
})

test.each(formats)('%s rejects unknown types before collecting feed pieces', async (format) => {
	await expect(GET(event('unconfigured', format))).rejects.toMatchObject({ status: 404 })
	expect(getPiecesForFeed).not.toHaveBeenCalled()
})

test.each([
	[undefined, 'https://assets.example/images/opengraph.png'],
	[{}, 'https://assets.example/images/opengraph.png'],
	[siteImageDefaults, 'https://assets.example/images/opengraph.png'],
	[{ favicon: siteImageDefaults.favicon }, 'https://assets.example/images/opengraph.png'],
	[{ opengraph: siteImageDefaults.opengraph }, 'https://assets.example/images/opengraph.png'],
	[{ favicon: '/private/icon.svg' }, 'https://assets.example/images/opengraph.png'],
	[{ opengraph: '/private/card.webp' }, 'https://app.example/assets/opengraph/card.webp'],
	[
		{ favicon: '/private/icon.svg', opengraph: '/private/card.webp' },
		'https://app.example/assets/opengraph/card.webp'
	]
] as const)('XML channel image resolves independently for %j', async (images, image) => {
	config.content.images = validateConfig(images ? { content: { images } } : {}, {}).content.images
	const xml = await (await GET(event(undefined, 'xml'))).text()
	expect(parseRssFeed(xml).image).toMatchObject({ url: image, link: config.url.app })
	expect(xml).toContain('https://app.example/pieces/field-notes/observation')
	expect(xml).not.toMatch(/private|icon.svg|assets\/favicon/)
})

test.each(['', '/garden', '//relative.example/garden'])(
	'XML channel image uses request origin for app URL %j',
	async (app) => {
		config.url.app = app
		config.url.app_assets = '/static'
		const xml = await (await GET(event('field-notes', 'xml'))).text()
		expect(xml).toContain('<url>https://request.test/static/images/opengraph.png</url>')
	}
)

test('XML escapes channel text and the absolute default image URL', async () => {
	config.url.app_assets = 'https://assets.example/a&b'
	const xml = await (await GET(event(undefined, 'xml'))).text()
	expect(parseRssFeed(xml).image?.url).toBe('https://assets.example/a&b/images/opengraph.png')
	expect(xml).toContain('<![CDATA[https://assets.example/a&b/images/opengraph.png]]>')
})
