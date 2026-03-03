import { describe, test, expect, vi, afterEach } from 'vitest'
import { run } from './image.js'
import { mockKysely } from '../database.mock.js'
import { mkdir, writeFile } from 'fs/promises'
import { getAssetPath, getAssetDir, getImageAssetPath, ASSET_SIZES, type Config } from '@luzzle/web.utils'
import { generateAssetKey } from '@luzzle/web.utils/server'
import { generateVariantJobs } from './variants.js'
import { Pieces } from '@luzzle/core'
import type { LuzzleSelectable } from '@luzzle/core'
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
	generateAssetKey: vi.mocked(generateAssetKey),
	generateVariantJobs: vi.mocked(generateVariantJobs),
}

const makeItem = (frontmatter_json: string): LuzzleSelectable<'pieces_items'> => ({
	id: '1',
	type: 'books',
	date_updated: 100,
	date_added: 50,
	frontmatter_json,
	file_path: 'book.md',
	note_markdown: '',
	assets_json_array: '[]',
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
		const { db } = mockKysely()
		const mockPieces = { getPieceAsset: vi.fn() } as unknown as Pieces
		mocks.generateAssetKey.mockReturnValue('key')

		await run({
			item: makeItem('{}'),
			config: makeConfig(),
			outDir: '/out',
			pieces: mockPieces,
			db,
		})

		expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
		expect(mocks.writeFile).not.toHaveBeenCalled()
	})

	test('does nothing for piece type not in config', async () => {
		const { db } = mockKysely()
		const mockPieces = { getPieceAsset: vi.fn() } as unknown as Pieces

		const config = makeConfig(['image'])
		const item = { ...makeItem('{"image": "photo.jpg"}'), type: 'unknown' }

		await run({ item, config, outDir: '/out', pieces: mockPieces, db })

		expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
	})

	test('warns when no assets found at field path', async () => {
		const { db, queries } = mockKysely()
		const mockPieces = { getPieceAsset: vi.fn() } as unknown as Pieces
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		mocks.generateAssetKey.mockReturnValue('key')
		mocks.getAssetDir.mockReturnValue('books/key')
		vi.spyOn(queries, 'execute').mockResolvedValue([])

		await run({
			item: makeItem('{}'),
			config: makeConfig(['image']),
			outDir: '/out',
			pieces: mockPieces,
			db,
		})

		expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('No assets found'))
		expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
		consoleWarnSpy.mockRestore()
	})

	test('warns and skips non-image files', async () => {
		const { db, queries } = mockKysely()
		const mockPieces = { getPieceAsset: vi.fn() } as unknown as Pieces
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

		mocks.generateAssetKey.mockReturnValue('key')
		mocks.getAssetDir.mockReturnValue('books/key')
		vi.spyOn(queries, 'execute').mockResolvedValue([])

		await run({
			item: makeItem('{"doc": "file.pdf"}'),
			config: makeConfig(['doc']),
			outDir: '/out',
			pieces: mockPieces,
			db,
		})

		expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping non-image file'))
		expect(mockPieces.getPieceAsset).not.toHaveBeenCalled()
		consoleWarnSpy.mockRestore()
	})

	test('copies image and generates variants', async () => {
		const { db, queries } = mockKysely()
		const mockPieces = {
			getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('image_data')),
		} as unknown as Pieces

		mocks.generateAssetKey.mockReturnValue('key')
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
		vi.spyOn(queries, 'execute').mockResolvedValue([])

		await run({
			item: makeItem('{"image": "photo.jpg"}'),
			config: makeConfig(['image']),
			outDir: '/out',
			pieces: mockPieces,
			db,
		})

		expect(mocks.mkdir).toHaveBeenCalledWith('/out/books/key', { recursive: true })
		expect(mockPieces.getPieceAsset).toHaveBeenCalledWith('photo.jpg')
		expect(mocks.writeFile).toHaveBeenCalledWith('/out/books/key/photo.jpg', Buffer.from('image_data'))
		expect(mocks.generateVariantJobs).toHaveBeenCalledOnce()
		expect(db.insertInto).toHaveBeenCalledWith('web_pieces_assets')
	})

	test('handles errors during asset processing gracefully', async () => {
		const { db, queries } = mockKysely()
		const mockPieces = {
			getPieceAsset: vi.fn().mockRejectedValue(new Error('read error')),
		} as unknown as Pieces
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		mocks.generateAssetKey.mockReturnValue('key')
		mocks.getAssetDir.mockReturnValue('books/key')
		mocks.getAssetPath.mockReturnValue('books/key/photo.jpg')
		vi.spyOn(queries, 'execute').mockResolvedValue([])

		await run({
			item: makeItem('{"image": "photo.jpg"}'),
			config: makeConfig(['image']),
			outDir: '/out',
			pieces: mockPieces,
			db,
		})

		expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('error processing media'))
		consoleErrorSpy.mockRestore()
	})

	test('handles errors during variant toFile gracefully', async () => {
		const { db, queries } = mockKysely()
		const mockPieces = {
			getPieceAsset: vi.fn().mockResolvedValue(Buffer.from('image_data')),
		} as unknown as Pieces
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		mocks.generateAssetKey.mockReturnValue('key')
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
		vi.spyOn(queries, 'execute').mockResolvedValue([])

		await run({
			item: makeItem('{"image": "photo.jpg"}'),
			config: makeConfig(['image']),
			outDir: '/out',
			pieces: mockPieces,
			db,
		})

		expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('error processing media'))
		consoleErrorSpy.mockRestore()
	})
})
