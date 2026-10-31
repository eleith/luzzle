import { expect, test, vi } from 'vitest'
import { load } from './+layout.server'

vi.mock('#lib/server/config.js', async () => {
	const { makeConfig: baseConfig, oidcAuth } = await import('#lib/server/config.fixture.js')
	return {
		config: {
			...baseConfig(),
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
				text: { title: 'Public title', description: 'Public description' }
			},
			url: { app: 'https://example.test', app_assets: '/app', luzzle_assets: '/assets' }
		}
	}
})

test('the layout returns only its safe projection and keeps configured CSS out of page data', async () => {
	const inlineConfiguredStyles = vi.fn()
	expect(
		await load({ locals: { inlineConfiguredStyles } } as unknown as Parameters<typeof load>[0])
	).toEqual({
		pieceTypes: ['runtime-kind'],
		config: {
			content: { text: { title: 'Public title', description: 'Public description' } },
			url: { app: 'https://example.test', app_assets: '/app', luzzle_assets: '/assets' }
		},
		meta: { title: 'Public title', description: 'Public description' }
	})
	expect(inlineConfiguredStyles).toHaveBeenCalledExactlyOnceWith()
})
