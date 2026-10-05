import { expect, test, vi } from 'vitest'
import { load } from './+layout.server'

vi.mock('$lib/server/config', async () => {
	const { makeConfig, oidcAuth } = await import('$lib/server/config.fixture')
	return {
		config: makeConfig({
			auth: oidcAuth,
			ai: { provider: 'google', api_key: 'private-ai-key' },
			content: {
				text: { title: 'Public title', description: 'Public description' },
				component: { root: '/private/components/root.svelte' }
			},
			url: { app: 'https://example.test', app_assets: '/app', luzzle_assets: '/assets' }
		})
	}
})

test('the public layout returns only its explicit safe configuration projection', async () => {
	expect(await load()).toEqual({
		config: {
			content: { text: { title: 'Public title', description: 'Public description' } },
			url: { app: 'https://example.test', app_assets: '/app', luzzle_assets: '/assets' }
		},
		meta: { title: 'Public title', description: 'Public description' }
	})
})
