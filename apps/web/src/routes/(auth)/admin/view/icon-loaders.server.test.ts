import { expect, test, vi } from 'vitest'
import { publishedPiece } from '#lib/pieces/viewer/fixtures/published.js'
import { load as published } from './published/[...path]/icon/+page.server.js'

vi.mock('#lib/server/config.js', async () => {
	const { fileURLToPath } = await import('node:url')
	const file = fileURLToPath(
		new URL('../../../../../demo/content/templates/icon/example.svelte', import.meta.url)
	)
	return {
		config: {
			url: { app: 'https://app.example', luzzle_assets: 'https://cdn.example' },
			pieces: {
				missing: { templates: { icon: { file: `${file}.missing` } } },
				invalid: {
					templates: { icon: { file, mapping: { images: { each: 'jacket', fields: {} } } } }
				}
			}
		}
	}
})

const piece = { ...publishedPiece, metadata: { jacket: 'cover' } }
const publishedEvent = (type: string) =>
	({ parent: async () => ({ piece: { ...piece, type } }) }) as unknown as Parameters<
		typeof published
	>[0]

test.each(['missing', 'invalid'])(
	'a %s external icon falls back without exposing the error',
	async (type) => {
		expect(await published(publishedEvent(type))).toEqual({ renderedIcon: undefined })
	}
)
