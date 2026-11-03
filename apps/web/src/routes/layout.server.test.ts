import { beforeEach, expect, test, vi } from 'vitest'
import { siteImageDefaults, validateConfig } from '@luzzle/web.config'
import { load } from './+layout.server'
import { config } from '#lib/server/config.js'

vi.mock('#lib/server/config.js', async () => {
	const { makeConfig, oidcAuth } = await import('#lib/server/config.fixture.js')
	const base = makeConfig()
	return {
		config: {
			...base,
			auth: oidcAuth,
			ai: { provider: 'google', api_key: 'private-ai-key' },
			pieces: [
				{
					type: 'runtime-kind',
					fields: { title: 'title', date_consumed: 'date' },
					templates: {
						icon: { name: 'default', mapping: {} },
						page: { name: 'default', mapping: { image: { field: 'private.cover' } } },
						opengraph: { name: 'default', mapping: {} }
					}
				}
			],
			content: {
				text: { title: 'Public title', description: 'Public description' },
				images: base.content.images,
				fonts: { sans: '/private/fonts/selected-font.woff2' }
			},
			url: { app: 'https://example.test', app_assets: '/app', luzzle_assets: '/assets' }
		}
	}
})

beforeEach(() => {
	config.content.images = validateConfig({}, {}).content.images
	config.url.app = 'https://example.test'
	config.url.app_assets = '/app'
})

function event(inlineConfiguredStyles = vi.fn()) {
	return {
		locals: { inlineConfiguredStyles },
		url: new URL('https://request.test/garden')
	} as unknown as Parameters<typeof load>[0]
}

test('the layout returns only its safe projection and keeps configured CSS out of page data', async () => {
	const inlineConfiguredStyles = vi.fn()
	expect(await load(event(inlineConfiguredStyles))).toEqual({
		pieceTypes: ['runtime-kind'],
		config: {
			content: {
				text: { title: 'Public title', description: 'Public description' },
				images: {
					favicon: '/app/images/favicon.png',
					opengraph: 'https://example.test/app/images/opengraph.png'
				}
			},
			url: { app: 'https://example.test', app_assets: '/app', luzzle_assets: '/assets' }
		},
		meta: { title: 'Public title', description: 'Public description' }
	})
	expect(inlineConfiguredStyles).toHaveBeenCalledExactlyOnceWith()
})

test.each([
	[undefined, '/app/images/favicon.png', 'https://example.test/app/images/opengraph.png'],
	[{}, '/app/images/favicon.png', 'https://example.test/app/images/opengraph.png'],
	[siteImageDefaults, '/app/images/favicon.png', 'https://example.test/app/images/opengraph.png'],
	[
		{ favicon: siteImageDefaults.favicon },
		'/app/images/favicon.png',
		'https://example.test/app/images/opengraph.png'
	],
	[
		{ opengraph: siteImageDefaults.opengraph },
		'/app/images/favicon.png',
		'https://example.test/app/images/opengraph.png'
	],
	[
		{ favicon: '/private/content/secret-icon.svg' },
		'/assets/favicon/secret-icon.svg',
		'https://example.test/app/images/opengraph.png'
	],
	[
		{ opengraph: '/private/content/secret-card.webp' },
		'/app/images/favicon.png',
		'https://example.test/assets/opengraph/secret-card.webp'
	],
	[
		{ favicon: '/private/content/secret-icon.svg', opengraph: '/private/content/secret-card.webp' },
		'/assets/favicon/secret-icon.svg',
		'https://example.test/assets/opengraph/secret-card.webp'
	],
	[
		{ favicon: '/private/content/icon 1.svg', opengraph: '/private/content/card 1.webp' },
		'/assets/favicon/icon%201.svg',
		'https://example.test/assets/opengraph/card%201.webp'
	]
] as const)(
	'projects only resolved public image URLs for %j',
	async (images, favicon, opengraph) => {
		config.content.images = validateConfig(images ? { content: { images } } : {}, {}).content.images
		const result = await load(event())
		expect(result).toMatchObject({
			config: { content: { images: { favicon, opengraph } } }
		})
		expect(result).not.toHaveProperty('config.content.fonts')
		expect(JSON.stringify(result)).not.toMatch(
			/private|selected-font|private-ai-key|clientSecret|templates/
		)
	}
)

test.each(['', '/garden', '//relative.example/garden'])(
	'uses the request origin with relative app URL %j',
	async (app) => {
		config.url.app = app
		config.content.images = validateConfig(
			{ content: { images: { opengraph: '/private/card.png' } } },
			{}
		).content.images
		expect(await load(event())).toMatchObject({
			config: {
				content: { images: { opengraph: 'https://request.test/assets/opengraph/card.png' } }
			}
		})
	}
)
