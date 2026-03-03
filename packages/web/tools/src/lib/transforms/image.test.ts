import { describe, test, expect, vi, afterEach } from 'vitest'
import { run } from './image.js'
import { mkdir, writeFile } from 'fs/promises'
import { getAssetPath, getAssetDir, getImageAssetPath, ASSET_SIZES, type Config, type WebPieces } from '@luzzle/web.utils'
import { generateVariantJobs } from './variants.js'
import { Pieces } from '@luzzle/core'
import type { Sharp } from 'sharp'

vi.mock('fs/promises')
vi.mock('@luzzle/web.utils')
vi.mock('@luzzle/web.utils/server')
vi.mock('./variants.js')

const mocks = {
	mkdir: vi.mocked(mkdir),
	writeFile: vi.mocked(writeFile),
	getAssetPath: vi.mocked(getAssetPath),
	getAssetDir: vi.mocked(getAssetDir),
	getImageAssetPath: vi.mocked(getImageAssetPath),
	generateVariantJobs: vi.mocked(generateVariantJobs),
}

const makeWebPiece = (json_metadata: string): WebPieces => ({
	id: '1',
	type: 'books',
	date_updated: 100,
	date_added: 50,
	json_metadata,
	file_path: 'book.md',
	key: 'key',
	slug: 'my-book',
	title: 'My Book',
})

const makeConfig = (media?: string[]): Config =>
	({
		pieces: [
			{
				type: 'books',
				fields: {
					title: 'title',
					date_consumed: 'date_consumed',
					...(media ? { media } : {}),
				},
			},
		],
		assets: { salt: 'test-salt' },
	}) as unknown as Config

afterEach(() => {
	vi.clearAllMocks()
})

describe('transforms/image', () => {
	test('does nothing when no media fields configured', async () => {
		const mockPieces = { getPieceAsset: vi.fn() } as unknown as Pieces

		const records = await run({
			webPiece: makeWebPiece('{}'),
			config: makeConfig(),
			outDir: '/out',
			pieces: mockPieces,
		})

		expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
		expect(mocks.writeFile).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('does nothing for piece type not in config', async () => {
		const mockPieces = { getPieceAsset: vi.fn() } as unknown as Pieces
		const config = makeConfig(['image'])
		const webPiece = { ...makeWebPiece('{"image": "photo.jpg"}'), type: 'unknown' }

		const records = await run({ webPiece, config, outDir: '/out', pieces: mockPieces })

		expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('returns empty when no assets found at field path', async () => {
		const mockPieces = { getPieceAsset: vi.fn() } as unknown as Pieces

		mocks.getAssetDir.mockReturnValue('books/key')

		const records = await run({
			webPiece: makeWebPiece('{}'),
			config: makeConfig(['image']),
			outDir: '/out',
			pieces: mockPieces,
		})

		expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
		expect(records).toEqual([])
	})

	test('throws on non-image file in media field', async () => {
		const mockPieces = { getPieceAsset: vi.fn() } as unknown as Pieces

		mocks.getAssetDir.mockReturnValue('books/key')

		await expect(
			run({
				webPiece: makeWebPiece('{"doc": "file.pdf"}'),
				config: makeConfig(['doc']),
				outDir: '/out',
				pieces: mockPieces,
			})
		).rejects.toThrow('non-image file')
	})

	test('copies image and generates variants, returns asset records', async () => {
		const mockPieces = {
			getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('image_data')),
		} as unknown as Pieces

		mocks.getAssetDir.mockReturnValue('books/key')
		mocks.getAssetPath.mockReturnValue('books/key/photo.jpg')
		mocks.getImageAssetPath.mockReturnValue('books/key/photo.s.jpg')
		vi.mocked(ASSET_SIZES as unknown as Record<string, number>).s = 125
		mocks.generateVariantJobs.mockResolvedValue([
			{
				sharp: { toFile: vi.fn().mockResolvedValue({ size: 100 }) } as unknown as Sharp,
				width: 125,
				format: 'jpg',
			},
		])

		const records = await run({
			webPiece: makeWebPiece('{"image": "photo.jpg"}'),
			config: makeConfig(['image']),
			outDir: '/out',
			pieces: mockPieces,
		})

		expect(mocks.mkdir).toHaveBeenCalledWith('/out/books/key', { recursive: true })
		expect(mockPieces.getPieceAsset).toHaveBeenCalledWith('photo.jpg')
		expect(mocks.writeFile).toHaveBeenCalledWith('/out/books/key/photo.jpg', Buffer.from('image_data'))
		expect(mocks.generateVariantJobs).toHaveBeenCalledOnce()
		expect(records).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ transformation: 'image.original' }),
				expect.objectContaining({ transformation: expect.stringContaining('image.') }),
			])
		)
	})

	test('throws on asset read error', async () => {
		const mockPieces = {
			getPieceAsset: vi.fn().mockRejectedValue(new Error('read error')),
		} as unknown as Pieces

		mocks.getAssetDir.mockReturnValue('books/key')
		mocks.getAssetPath.mockReturnValue('books/key/photo.jpg')

		await expect(
			run({
				webPiece: makeWebPiece('{"image": "photo.jpg"}'),
				config: makeConfig(['image']),
				outDir: '/out',
				pieces: mockPieces,
			})
		).rejects.toThrow('read error')
	})

	test('throws on variant toFile error', async () => {
		const mockPieces = {
			getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('image_data')),
		} as unknown as Pieces

		mocks.getAssetDir.mockReturnValue('books/key')
		mocks.getAssetPath.mockReturnValue('books/key/photo.jpg')
		mocks.getImageAssetPath.mockReturnValue('books/key/photo.s.jpg')
		mocks.generateVariantJobs.mockResolvedValue([
			{
				sharp: { toFile: vi.fn().mockRejectedValue(new Error('toFile error')) } as unknown as Sharp,
				width: 125,
				format: 'jpg',
			},
		])

		await expect(
			run({
				webPiece: makeWebPiece('{"image": "photo.jpg"}'),
				config: makeConfig(['image']),
				outDir: '/out',
				pieces: mockPieces,
			})
		).rejects.toThrow('toFile error')
	})
})
