import { assetPathToUrl } from '@luzzle/web.pieces'
import { beforeEach, expect, test, vi } from 'vitest'
import { loadPublicPiece as load } from './piece.js'

const { query, hydratePublicPiece, config } = vi.hoisted(() => ({
	query: {
		selectAll: vi.fn().mockReturnThis(),
		select: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		distinct: vi.fn().mockReturnThis(),
		executeTakeFirst: vi.fn(),
		execute: vi.fn()
	},
	hydratePublicPiece: vi.fn(),
	config: {
		pieces: [{ type: 'books' }],
		url: { app: 'https://app.example', luzzle_assets: '' },
		content: { text: { title: 'Garden' } }
	}
}))
vi.mock('#lib/server/database/index.js', () => ({ db: { selectFrom: () => query } }))
vi.mock('#lib/server/config.js', () => ({ config }))
vi.mock('#lib/pieces/assets.server.js', () => ({ hydratePublicPiece }))

function event() {
	return {
		params: { piece: 'books', slug: 'book' },
		url: new URL('https://app.example/pieces/books/book')
	} as Parameters<typeof load>[0]
}

beforeEach(() => {
	vi.clearAllMocks()
	query.executeTakeFirst.mockResolvedValue({ id: 'book', file_path: 'book.books.md' })
	query.execute.mockResolvedValue([{ slug: 'fiction', tag: 'Fiction' }])
	hydratePublicPiece.mockResolvedValue({
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
			image: assetPathToUrl('books/key/share image.png', config.url.app),
			title: 'Book | Garden'
		}
	})
	expect(query.where).toHaveBeenCalledWith('piece_id', '=', 'book')
	expect(hydratePublicPiece).toHaveBeenCalledOnce()
})

test.each([
	{ assets: [] },
	{ assets: [{ transformation: 'opengraph', asset_path: '../private.png' }] }
])('missing or invalid recorded images leave site fallback intact', async ({ assets }) => {
	hydratePublicPiece.mockResolvedValue({ id: 'book', title: 'Book', type: 'books', assets })
	expect(await load(event())).toMatchObject({ meta: { image: undefined } })
})

test('unconfigured public piece types fail before querying persisted records', async () => {
	const request = event()
	request.params.piece = 'unconfigured'
	await expect(load(request)).rejects.toMatchObject({ status: 404 })
	expect(query.executeTakeFirst).not.toHaveBeenCalled()
})

test('missing public pieces remain a 404', async () => {
	query.executeTakeFirst.mockResolvedValue(undefined)
	await expect(load(event())).rejects.toMatchObject({ status: 404 })
	expect(hydratePublicPiece).not.toHaveBeenCalled()
})
