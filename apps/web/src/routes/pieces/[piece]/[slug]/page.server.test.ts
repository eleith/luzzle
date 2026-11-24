import { expect, test, vi } from 'vitest'
import { load } from './+page.server.js'

const detail = {
	piece: { type: 'records', slug: 'album', raw: 'private source', assets: [] },
	tags: [{ slug: 'music', tag: 'Music' }],
	meta: { title: 'Album' }
}
const renderedPage = { html: '<h1>Album</h1>', css: '' }
const { config, renderPublishedPage } = vi.hoisted(() => ({
	config: { pieces: [] },
	renderPublishedPage: vi.fn()
}))
vi.mock('#lib/server/config.js', () => ({ config }))
vi.mock('#lib/server/load/piece.js', () => ({ loadPublicPiece: async () => detail }))
vi.mock('#lib/server/templates/page.js', () => ({ renderPublishedPage }))

test('renders with the hydrated record but only sends the identity, head metadata and rendered page', async () => {
	renderPublishedPage.mockResolvedValue(renderedPage)
	const event = { params: { piece: 'records', slug: 'album' } } as Parameters<typeof load>[0]
	expect(await load(event)).toEqual({
		piece: { type: 'records', slug: 'album' },
		meta: detail.meta,
		renderedPage
	})
	expect(renderPublishedPage).toHaveBeenCalledExactlyOnceWith(detail.piece, detail.tags, config)
})
