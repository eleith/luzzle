import { describe, test, expect, vi, afterEach } from 'vitest'
import { generateVariants } from '../variants.js'
import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { AppConfig, loadConfig } from '../../lib/config-loader.js'
import { getDatabaseClient } from '@luzzle/core'
import { Pieces, StorageFileSystem } from '@luzzle/cli'
import { mockKysely } from '../sqlite/database.mock.js'
import { mkdir, writeFile } from 'fs/promises'
import { getVariantPath, generateVariantJobs } from '../variants/variants.js'
import { Sharp } from 'sharp'

vi.mock('../../lib/lastRun.js')
vi.mock('../../lib/config-loader.js')
vi.mock('@luzzle/core')
vi.mock('@luzzle/cli')
vi.mock('fs/promises')
vi.mock('../variants/variants.js', async () => {
	const actual = await vi.importActual('../variants/variants.js')
	return {
		...actual,
		generateVariantJobs: vi.fn(),
		getVariantPath: vi.fn(),
	}
})

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
			paths: { database: '/path/to/db.sqlite' },
		} as unknown as AppConfig)
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

		// Mock generateVariantJobs
		mocks.generateVariantJobs.mockResolvedValue([
			{ sharp: { toFile: vi.fn() } as unknown as Sharp, size: 125, format: 'jpg' },
		])

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.loadConfig).toHaveBeenCalledWith({ userConfigPath: '/path/to/config.yaml' })
		expect(mocks.getDatabaseClient).toHaveBeenCalledWith('/path/to/db.sqlite')
		expect(mocks.getLastRunFor).toHaveBeenCalledWith('/path/to/out', 'generate-variants')
		expect(mocks.StorageFileSystem).toHaveBeenCalledWith('/path/to/luzzle')
		expect(mocks.Pieces).toHaveBeenCalledWith(mockStorage)
		expect(mocks.mkdir).toHaveBeenCalledWith('/path/to/out/books/1', { recursive: true })
		expect(mocks.writeFile).toHaveBeenCalledWith('/path/to/out/books/1/image.jpg', 'asset_content')
		expect(mocks.generateVariantJobs).toHaveBeenCalledWith(
			'image.jpg',
			mockPieces,
			[125, 250, 500, 1000],
			['avif', 'jpg']
		)
	})
	test('should handle errors during variant generation', async () => {
		mocks.loadConfig.mockReturnValue({
			paths: { database: '/path/to/db.sqlite' },
		} as unknown as AppConfig)
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

		// Mock generateVariantJobs to throw an error
		mocks.generateVariantJobs.mockRejectedValue(new Error('test error'))

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(consoleErrorSpy).toHaveBeenCalledOnce()

		consoleErrorSpy.mockRestore()
	})
	test('should do nothing if there are no items to process', async () => {
		mocks.loadConfig.mockReturnValue({
			paths: { database: '/path/to/db.sqlite' },
		} as unknown as AppConfig)
		const mockDb = mockKysely()

		vi.spyOn(mockDb.queries, 'execute').mockResolvedValueOnce([])
		mocks.getDatabaseClient.mockReturnValue(mockDb.db)

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.generateVariantJobs).not.toHaveBeenCalled()
	})
	test('should force variant generation', async () => {
		mocks.loadConfig.mockReturnValue({
			paths: { database: '/path/to/db.sqlite' },
		} as unknown as AppConfig)
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

		// Mock generateVariantJobs
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
			paths: { database: '/path/to/db.sqlite' },
		} as unknown as AppConfig)
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

		// Mock lastRun
		mocks.getLastRunFor.mockResolvedValue(new Date(0))

		// Mock StorageFileSystem and Pieces
		const mockStorage = { readFileSync: vi.fn() } as unknown as StorageFileSystem
		const mockPieces = { getPieceAsset: vi.fn(() => 'asset_content') } as unknown as Pieces

		mocks.StorageFileSystem.mockReturnValue(mockStorage)
		mocks.Pieces.mockReturnValue(mockPieces)

		mocks.getVariantPath.mockReturnValue('books/1/image.jpg')

		// Mock generateVariantJobs
		mocks.generateVariantJobs.mockResolvedValue([
			{ sharp: { toFile: vi.fn() } as unknown as Sharp, size: 125, format: 'jpg' },
		])

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', { limit: 1 })

		expect(mocks.generateVariantJobs).toHaveBeenCalledOnce()
	})
	test('should handle items with no assets', async () => {
		mocks.loadConfig.mockReturnValue({
			paths: { database: '/path/to/db.sqlite' },
		} as unknown as AppConfig)
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

		// Mock lastRun
		mocks.getLastRunFor.mockResolvedValue(new Date(0))

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.generateVariantJobs).not.toHaveBeenCalled()
	})
})
