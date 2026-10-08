import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { WebPieces, WebPiecesAsset } from '@luzzle/web.db'
import { hydrateWithAssets, hydrateWithAssetsInternal } from './assets.server.js'

const { selectFrom, query } = vi.hoisted(() => {
	const query = {
		selectAll: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		execute: vi.fn()
	}
	return { selectFrom: vi.fn(() => query), query }
})
vi.mock('$lib/server/database', () => ({ db: { selectFrom } }))

function makePiece(overrides: Partial<WebPieces> = {}) {
	return {
		id: 'book-id',
		key: 'book-key',
		title: 'Published book',
		slug: 'published-book',
		type: 'books',
		file_path: 'books/published.books.md',
		content_hash: 'completed-source-hash',
		last_published_at: 1750000000000,
		json_metadata: JSON.stringify({ author: 'Ada', tags: ['fiction'], rating: 5 }),
		note: 'Published note',
		date_added: 100,
		date_updated: 200,
		date_consumed: 150,
		summary: 'Published summary',
		keywords: 'fiction,book',
		...overrides
	}
}

function makeAsset(overrides: Partial<WebPiecesAsset> = {}): WebPiecesAsset {
	return {
		piece_file_path: 'books/published.books.md',
		piece_key: 'book-key',
		piece_asset_path: '.assets/original-cover.jpg',
		piece_field_path: 'cover.image',
		asset_key: 'cover-key',
		transformation: 'image.original',
		asset_path: 'cover-key/original.jpg',
		mime_type: 'image/jpeg',
		is_embedded: 1,
		content: 'published asset content',
		...overrides
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	query.execute.mockResolvedValue([])
})

describe('hydrateWithAssets', () => {
	test('hydrates a single piece with parsed metadata and queries its ordered assets', async () => {
		const piece = makePiece()
		query.execute.mockResolvedValue([makeAsset()])

		const hydrated = await hydrateWithAssets(piece)

		expect(Array.isArray(hydrated)).toBe(false)
		expect(hydrated).toMatchObject({
			id: piece.id,
			title: piece.title,
			metadata: { author: 'Ada', tags: ['fiction'], rating: 5 },
			assets: [{ asset_key: 'cover-key', transformation: 'image.original' }]
		})
		expect(selectFrom).toHaveBeenCalledExactlyOnceWith('web_pieces_assets')
		expect(query.selectAll).toHaveBeenCalledOnce()
		expect(query.where).toHaveBeenCalledExactlyOnceWith('piece_file_path', 'in', [piece.file_path])
		expect(query.orderBy.mock.calls).toEqual([['piece_asset_path'], ['transformation']])
		expect(query.execute).toHaveBeenCalledOnce()
	})

	test('hydrates an array in input order and groups assets by source path, not piece key', async () => {
		const first = makePiece()
		const second = makePiece({ id: 'second', file_path: 'books/second.books.md' })
		const noAssets = makePiece({ id: 'third', file_path: 'books/third.books.md' })
		query.execute.mockResolvedValue([
			makeAsset({ piece_file_path: second.file_path, asset_key: 'second-cover' }),
			makeAsset({ asset_key: 'first-cover' }),
			makeAsset({ asset_key: 'first-palette', transformation: 'palette' })
		])

		const hydrated = await hydrateWithAssets([first, second, noAssets])

		expect(hydrated.map((piece) => piece.id)).toEqual(['book-id', 'second', 'third'])
		expect(hydrated.map((piece) => piece.assets.map((asset) => asset.asset_key))).toEqual([
			['first-cover', 'first-palette'],
			['second-cover'],
			[]
		])
		expect(query.where).toHaveBeenCalledExactlyOnceWith('piece_file_path', 'in', [
			first.file_path,
			second.file_path,
			noAssets.file_path
		])
		expect(query.execute).toHaveBeenCalledOnce()
	})

	test('keeps a one-element input array as an array', async () => {
		const hydrated = await hydrateWithAssets([makePiece()])

		expect(hydrated).toHaveLength(1)
		expect(hydrated[0].assets).toEqual([])
	})

	test('returns an empty array without querying assets', async () => {
		expect(await hydrateWithAssets([])).toEqual([])
		expect(selectFrom).not.toHaveBeenCalled()
		expect(query.execute).not.toHaveBeenCalled()
	})

	test.each(['', '{}'])(
		'uses empty metadata for %j and keeps pieces without assets',
		async (json) => {
			const hydrated = await hydrateWithAssets(makePiece({ json_metadata: json }))

			expect(hydrated.metadata).toEqual({})
			expect(hydrated.assets).toEqual([])
		}
	)

	test('projects only public piece and asset fields at runtime and in JSON', async () => {
		const piece = makePiece()
		const asset = makeAsset()
		query.execute.mockResolvedValue([asset])

		const hydrated = await hydrateWithAssets(piece)
		const expected = {
			id: piece.id,
			key: piece.key,
			title: piece.title,
			slug: piece.slug,
			type: piece.type,
			note: piece.note,
			date_added: piece.date_added,
			date_updated: piece.date_updated,
			date_consumed: piece.date_consumed,
			summary: piece.summary,
			keywords: piece.keywords,
			metadata: JSON.parse(piece.json_metadata),
			assets: [
				{
					asset_key: asset.asset_key,
					transformation: asset.transformation,
					asset_path: asset.asset_path,
					mime_type: asset.mime_type,
					is_embedded: asset.is_embedded,
					content: asset.content
				}
			]
		}

		expect(hydrated).toStrictEqual(expected)
		expect(JSON.parse(JSON.stringify(hydrated))).toStrictEqual(expected)
		for (const field of ['file_path', 'json_metadata', 'content_hash', 'last_published_at']) {
			expect(hydrated).not.toHaveProperty(field)
		}
		for (const field of ['piece_file_path', 'piece_key', 'piece_asset_path', 'piece_field_path']) {
			expect(hydrated.assets[0]).not.toHaveProperty(field)
		}
		// Public hydration must not remove private fields from the original DB records.
		expect(piece.content_hash).toBe('completed-source-hash')
		expect(piece.last_published_at).toBe(1750000000000)
		expect(asset.piece_asset_path).toBe('.assets/original-cover.jpg')
	})

	test('strips null completion markers and retains allowed optional asset values', async () => {
		const piece = { ...makePiece(), content_hash: null, last_published_at: null }
		query.execute.mockResolvedValue([makeAsset({ asset_path: null, is_embedded: 0 })])

		const hydrated = await hydrateWithAssets(piece)

		expect(hydrated).not.toHaveProperty('content_hash')
		expect(hydrated).not.toHaveProperty('last_published_at')
		expect(hydrated.assets[0]).toMatchObject({ asset_path: null, is_embedded: 0 })
	})
})

describe('hydrateWithAssetsInternal', () => {
	test('retains all internal piece and asset fields without parsing metadata', async () => {
		const piece = makePiece()
		const asset = makeAsset()
		query.execute.mockResolvedValue([asset])

		const hydrated = await hydrateWithAssetsInternal(piece)

		expect(hydrated).toStrictEqual({ ...piece, assets: [asset] })
		expect(hydrated).not.toHaveProperty('metadata')
		expect(JSON.parse(JSON.stringify(hydrated))).toStrictEqual({ ...piece, assets: [asset] })
		expect(query.where).toHaveBeenCalledExactlyOnceWith('piece_file_path', 'in', [piece.file_path])
	})

	test('groups array assets by source path and retains internal fields, including empty groups', async () => {
		const first = makePiece()
		const second = makePiece({ id: 'second', file_path: 'books/second.books.md' })
		const noAssets = makePiece({ id: 'third', file_path: 'books/third.books.md' })
		const firstAsset = makeAsset()
		const secondAsset = makeAsset({ piece_file_path: second.file_path, asset_key: 'second-cover' })
		query.execute.mockResolvedValue([secondAsset, firstAsset])

		expect(await hydrateWithAssetsInternal([first, second, noAssets])).toStrictEqual([
			{ ...first, assets: [firstAsset] },
			{ ...second, assets: [secondAsset] },
			{ ...noAssets, assets: [] }
		])
		expect(query.execute).toHaveBeenCalledOnce()
	})

	test('returns an empty array without querying assets', async () => {
		expect(await hydrateWithAssetsInternal([])).toEqual([])
		expect(selectFrom).not.toHaveBeenCalled()
		expect(query.execute).not.toHaveBeenCalled()
	})
})
