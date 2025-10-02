import { describe, test, expect, vi, afterEach } from 'vitest'
import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { Config, loadConfig } from '../../lib/config/config.js'
import { getDatabaseClient } from '@luzzle/core'
import { Pieces, StorageFileSystem } from '@luzzle/cli'
import { mockKysely } from '../sqlite/database.mock.js'
import { mkdir, writeFile } from 'fs/promises'
import { generateVariantJobs } from '../variants/variants.js'
import { Sharp } from 'sharp'
import { getVariantPath } from './utils.js'
import generateVariants from './index.js'

vi.mock('../../lib/lastRun.js')
vi.mock('../../lib/config/config.js')
vi.mock('@luzzle/core')
vi.mock('@luzzle/cli')
vi.mock('fs/promises')
vi.mock('./variants.js')
vi.mock('./utils.js')

const mocks = {
	getLastRunFor: vi.mocked(getLastRunFor),
	setLastRunFor: vi.mocked(setLastRunFor),
	loadConfig: vi.mocked(loadConfig),
	getDatabaseClient: vi.mocked(getDatabaseClient),
	Pieces: vi.mocked(Pieces),
	StorageFileSystem: vi.mocked(StorageFileSystem),
	generateVariantJobs: vi.mocked(generateVariantJobs),
	getVariantPath: vi.mocked(getVariantPath),
	mkdir: vi.mocked(mkdir),
	writeFile: vi.mocked(writeFile),
}

describe('generateVariants', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should generate variants for image assets', async () => {
		mocks.loadConfig.mockReturnValue({
			paths: { database: 'db.sqlite' },
		} as unknown as Config)
		const mockDb = mockKysely()

		vi.spyOn(mockDb.queries, 'execute').mockResolvedValueOnce([
			{
				id: '1',
				type: 'books',
				date_updated: 100,
				date_added: 50,
				assets_json_array: '["image.jpg"]',
				file_path: 'book.md',
			},
		])
		mocks.getDatabaseClient.mockReturnValue(mockDb.db)

		// Mock lastRun
		mocks.getLastRunFor.mockResolvedValue(new Date(0))

		// Mock StorageFileSystem and Pieces
		const mockStorage = { readFileSync: vi.fn() } as unknown as StorageFileSystem
		const mockPieces = { getPieceAsset: vi.fn(() => 'asset_content') } as unknown as Pieces

		mocks.StorageFileSystem.mockReturnValue(mockStorage)
		mocks.Pieces.mockReturnValue(mockPieces)
		mocks.getVariantPath.mockReturnValue('books/1/image.jpg')
		const toFileMock = vi.fn().mockResolvedValue(undefined)
		mocks.generateVariantJobs.mockResolvedValue([
			{ sharp: { toFile: toFileMock } as unknown as Sharp, size: 125, format: 'jpg' },
		])

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.loadConfig).toHaveBeenCalledWith('/path/to/config.yaml')
		expect(mocks.getDatabaseClient).toHaveBeenCalledWith('/path/to/db.sqlite')
		expect(mocks.getLastRunFor).toHaveBeenCalledWith('/path/to/out', 'generate-variants')
		expect(mocks.StorageFileSystem).toHaveBeenCalledWith('/path/to/luzzle')
		expect(mocks.Pieces).toHaveBeenCalledWith(mockStorage)
		expect(mocks.mkdir).toHaveBeenCalledWith('/path/to/out/books/1', { recursive: true })
		expect(toFileMock).toHaveBeenCalledWith('/path/to/out/books/1/image.jpg')
		expect(mocks.generateVariantJobs).toHaveBeenCalledWith(
			{
				id: '1',
				type: 'books',
				date_updated: 100,
				date_added: 50,
				assets_json_array: '["image.jpg"]',
				file_path: 'book.md',
			},
			'image.jpg',
			mockPieces,
			[125, 250, 500, 1000],
			['avif', 'jpg']
		)
	})
	test('should handle errors during variant generation', async () => {
		mocks.loadConfig.mockReturnValue({
			paths: { database: 'db.sqlite' },
		} as unknown as Config)
		const mockDb = mockKysely()

		vi.spyOn(mockDb.queries, 'execute').mockResolvedValueOnce([
			{
				id: '1',
				type: 'books',
				date_updated: 100,
				date_added: 50,
				assets_json_array: '["image.jpg"]',
				file_path: 'book.md',
			},
		])
		mocks.getDatabaseClient.mockReturnValue(mockDb.db)

		// Mock lastRun
		mocks.getLastRunFor.mockResolvedValue(new Date(0))

		// Mock StorageFileSystem and Pieces
		const mockStorage = { readFileSync: vi.fn() } as unknown as StorageFileSystem
		const mockPieces = { getPieceAsset: vi.fn(() => 'asset_content') } as unknown as Pieces

		mocks.StorageFileSystem.mockReturnValue(mockStorage)
		mocks.Pieces.mockReturnValue(mockPieces)
		mocks.getVariantPath.mockReturnValue('books/1/image.jpg')
		mocks.generateVariantJobs.mockRejectedValue(new Error('test error'))

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(consoleErrorSpy).toHaveBeenCalledOnce()

		consoleErrorSpy.mockRestore()
	})
	test('should do nothing if there are no items to process', async () => {
		mocks.loadConfig.mockReturnValue({
			paths: { database: 'db.sqlite' },
		} as unknown as Config)
		const mockDb = mockKysely()

		vi.spyOn(mockDb.queries, 'execute').mockResolvedValueOnce([])
		mocks.getDatabaseClient.mockReturnValue(mockDb.db)
		mocks.generateVariantJobs.mockResolvedValue([])

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.generateVariantJobs).not.toHaveBeenCalled()
	})
	test('should force variant generation', async () => {
		mocks.loadConfig.mockReturnValue({
			paths: { database: 'db.sqlite' },
		} as unknown as Config)
		const mockDb = mockKysely()

		vi.spyOn(mockDb.queries, 'execute').mockResolvedValueOnce([
			{
				id: '1',
				type: 'books',
				date_updated: 0,
				date_added: 0,
				assets_json_array: '["image.jpg"]',
				file_path: 'book.md',
			},
		])
		mocks.getDatabaseClient.mockReturnValue(mockDb.db)

		// Mock lastRun
		mocks.getLastRunFor.mockResolvedValue(new Date())

		// Mock StorageFileSystem and Pieces
		const mockStorage = { readFileSync: vi.fn() } as unknown as StorageFileSystem
		const mockPieces = { getPieceAsset: vi.fn(() => 'asset_content') } as unknown as Pieces

		mocks.StorageFileSystem.mockReturnValue(mockStorage)
		mocks.Pieces.mockReturnValue(mockPieces)
		mocks.getVariantPath.mockReturnValue('books/1/image.jpg')
		mocks.generateVariantJobs.mockResolvedValue([
			{ sharp: { toFile: vi.fn() } as unknown as Sharp, size: 125, format: 'jpg' },
		])

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {
			force: true,
		})

		expect(mocks.generateVariantJobs).toHaveBeenCalledOnce()
	})
	test('should limit variant generation', async () => {
		mocks.loadConfig.mockReturnValue({
			paths: { database: 'db.sqlite' },
		} as unknown as Config)
		const mockDb = mockKysely()

		vi.spyOn(mockDb.queries, 'execute').mockResolvedValueOnce([
			{
				id: '1',
				type: 'books',
				date_updated: 100,
				date_added: 50,
				assets_json_array: '["image.jpg"]',
				file_path: 'book.md',
			},
			{
				id: '2',
				type: 'books',
				date_updated: 100,
				date_added: 50,
				assets_json_array: '["image.jpg"]',
				file_path: 'book2.md',
			},
		])
		mocks.getDatabaseClient.mockReturnValue(mockDb.db)
		mocks.getLastRunFor.mockResolvedValue(new Date(0))

		const mockStorage = { readFileSync: vi.fn() } as unknown as StorageFileSystem
		const mockPieces = { getPieceAsset: vi.fn(() => 'asset_content') } as unknown as Pieces

		mocks.StorageFileSystem.mockReturnValue(mockStorage)
		mocks.Pieces.mockReturnValue(mockPieces)
		mocks.getVariantPath.mockReturnValue('books/1/image.jpg')
		mocks.generateVariantJobs.mockResolvedValue([
			{ sharp: { toFile: vi.fn() } as unknown as Sharp, size: 125, format: 'jpg' },
		])

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', { limit: 1 })

		expect(mocks.generateVariantJobs).toHaveBeenCalledOnce()
	})
	test('should handle items with no assets', async () => {
		mocks.loadConfig.mockReturnValue({
			paths: { database: 'db.sqlite' },
		} as unknown as Config)
		const mockDb = mockKysely()

		vi.spyOn(mockDb.queries, 'execute').mockResolvedValueOnce([
			{
				id: '1',
				type: 'books',
				date_updated: 100,
				date_added: 50,
				assets_json_array: null,
				file_path: 'book.md',
			},
		])
		mocks.getDatabaseClient.mockReturnValue(mockDb.db)
		mocks.getLastRunFor.mockResolvedValue(new Date(0))
		mocks.generateVariantJobs.mockResolvedValue([])

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.generateVariantJobs).not.toHaveBeenCalled()
	})
})
