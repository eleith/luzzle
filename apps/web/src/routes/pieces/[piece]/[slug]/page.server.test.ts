import { expect, test, vi } from 'vitest'
import { load } from './+page.server.js'

const detail = {
	piece: { type: 'records', slug: 'album', raw: 'private source', assets: [] },
	tags: [{ slug: 'music', tag: 'Music' }],
	meta: { title: 'Album' }
}
const event = { params: { piece: 'records', slug: 'album' } } as Parameters<typeof load>[0]
const renderedPage = { html: '<h1>Album</h1>', css: '' }
const { config, renderAuthoredPage } = vi.hoisted(() => ({
	config: { pieces: [] },
	renderAuthoredPage: vi.fn()
}))
vi.mock('#lib/server/config.js', () => ({ config }))
vi.mock('#lib/server/load/piece.js', () => ({ loadPublicPiece: async () => detail }))
vi.mock('#lib/server/templates/page.js', () => ({ renderAuthoredPage }))

test('renders with the hydrated record but only sends the identity, head metadata and rendered page', async () => {
	renderAuthoredPage.mockResolvedValue(renderedPage)
	expect(await load(event)).toEqual({
		piece: { type: 'records', slug: 'album' },
		meta: detail.meta,
		renderedPage
	})
	expect(renderAuthoredPage).toHaveBeenCalledExactlyOnceWith(detail.piece, detail.tags, config)
})

test('rejects a public file-template route without a configured file', async () => {
	renderAuthoredPage.mockResolvedValue(null)
	await expect(load(event)).rejects.toThrow('No page template file configured for records')
})
