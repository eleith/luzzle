import { beforeEach, expect, test, vi } from 'vitest'
import { load } from './+page.server.js'

const { query, hydrateWithAssets, config } = vi.hoisted(() => ({
	query: {
		selectAll: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		distinct: vi.fn().mockReturnThis(),
		executeTakeFirst: vi.fn(),
		execute: vi.fn()
	},
	hydrateWithAssets: vi.fn(),
	config: {
		url: { app: 'https://app.example', luzzle_assets: '' },
		content: { text: { title: 'Garden' } }
	}
}))
vi.mock('$lib/server/database', () => ({ db: { selectFrom: () => query } }))
vi.mock('$lib/server/config', () => ({ config }))
vi.mock('$lib/pieces/assets.server', () => ({ hydrateWithAssets }))

function event() {
	return { params: { piece: 'books', slug: 'book' } } as Parameters<typeof load>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	config.url.luzzle_assets = ''
	query.executeTakeFirst.mockResolvedValue({ id: 'book', file_path: 'book.books.md' })
	query.execute.mockResolvedValue([{ slug: 'fiction', tag: 'Fiction' }])
	hydrateWithAssets.mockResolvedValue({
		id: 'book',
		title: 'Book',
		type: 'books',
		summary: 'Summary',
		assets: [{ transformation: 'opengraph', asset_path: 'books/key/share image.png' }]
	})
})

test('public page meta uses the app base when CDN is not configured and retains tags', async () => {
	const data = await load(event())
	expect(data).toMatchObject({
		tags: [{ slug: 'fiction', tag: 'Fiction' }],
		meta: {
			image: 'https://app.example/pieces/assets/books/key/share%20image.png',
			title: 'Book | Garden'
		}
	})
	expect(query.where).toHaveBeenCalledWith('piece_id', '=', 'book')
	expect(hydrateWithAssets).toHaveBeenCalledOnce()
})

test('public meta uses the configured CDN prefix', async () => {
	config.url.luzzle_assets = 'https://cdn.example/prefix/'
	expect(await load(event())).toMatchObject({
		meta: { image: 'https://cdn.example/prefix/pieces/assets/books/key/share%20image.png' }
	})
})

test.each([
	{ assets: [] },
	{ assets: [{ transformation: 'opengraph', asset_path: '../private.png' }] }
])('missing or invalid recorded images leave site fallback intact', async ({ assets }) => {
	hydrateWithAssets.mockResolvedValue({ id: 'book', title: 'Book', type: 'books', assets })
	expect(await load(event())).toMatchObject({ meta: { image: undefined } })
})

test('missing public pieces remain a 404', async () => {
	query.executeTakeFirst.mockResolvedValue(undefined)
	await expect(load(event())).rejects.toMatchObject({ status: 404 })
	expect(hydrateWithAssets).not.toHaveBeenCalled()
})
