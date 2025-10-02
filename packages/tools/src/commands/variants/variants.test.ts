import { describe, test, expect, vi, afterEach } from 'vitest'
import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { Config, loadConfig } from '../../lib/config/config.js'
import { getDatabaseClient, LuzzleSelectable } from '@luzzle/core'
import { Pieces, StorageFileSystem } from '@luzzle/cli'
import { mockKysely } from '../sqlite/database.mock.js'
import { copyFile, mkdir } from 'fs/promises'
import { generateVariantJobs } from '../variants/variants.js'
import { getAssetDir, getAssetPath, isImage } from './utils.js'
import generateVariants from './index.js'
import { Sharp } from 'sharp'

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
	getAssetPath: vi.mocked(getAssetPath),
	getAssetDir: vi.mocked(getAssetDir),
	isImage: vi.mocked(isImage),
	mkdir: vi.mocked(mkdir),
	copyFile: vi.mocked(copyFile),
}

const setupDefaultMocks = (
	items: LuzzleSelectable<'pieces_items'>[] = [],
	pieces: Config['pieces'] = []
) => {
	mocks.loadConfig.mockReturnValue({
		paths: { database: 'db.sqlite' },
		pieces: pieces,
	} as unknown as Config)

	const mockDb = mockKysely()
	vi.spyOn(mockDb.queries, 'execute').mockResolvedValue(items)
	mocks.getDatabaseClient.mockReturnValue(mockDb.db)

	mocks.getLastRunFor.mockResolvedValue(new Date(0))

	const mockStorage = { readFileSync: vi.fn() } as unknown as StorageFileSystem
	const mockPieces = { getPieceAsset: vi.fn(() => 'asset_content') } as unknown as Pieces
	mocks.StorageFileSystem.mockReturnValue(mockStorage)
	mocks.Pieces.mockReturnValue(mockPieces)
}

describe('generateVariants', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should copy assets and generate variants for image assets', async () => {
		setupDefaultMocks(
			[
				{
					id: '1',
					type: 'books',
					date_updated: 100,
					date_added: 50,
					frontmatter_json: '{"image": "/path/to/image.jpg", "document": "/path/to/document.pdf"}',
					file_path: 'book.md',
					note_markdown: '',
					assets_json_array: '[]',
				},
			],
			[
				{
					type: 'books',
					fields: {
						media: 'image',
						assets: ['document'],
						title: 'title',
						date_consumed: 'date_consumed',
					},
				},
			]
		)

		mocks.isImage.mockImplementation((asset) => asset.endsWith('.jpg'))
		mocks.getAssetDir.mockReturnValue('books/1')
		mocks.getAssetPath.mockImplementation(
			(type, id, asset) => `${type}/${id}/${asset.split('/').pop()}`
		)

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.mkdir).toHaveBeenCalledWith('/path/to/out/books/1', { recursive: true })
		expect(mocks.copyFile).toHaveBeenCalledWith(
			'/path/to/image.jpg',
			'/path/to/out/books/1/image.jpg'
		)
		expect(mocks.copyFile).toHaveBeenCalledWith(
			'/path/to/document.pdf',
			'/path/to/out/books/1/document.pdf'
		)
		expect(mocks.generateVariantJobs).toHaveBeenCalledOnce()
	})

	test('should only copy assets if they are not images', async () => {
		setupDefaultMocks(
			[
				{
					id: '1',
					type: 'books',
					date_updated: 100,
					date_added: 50,
					frontmatter_json: '{"document": "/path/to/document.pdf"}',
					file_path: 'book.md',
					note_markdown: '',
					assets_json_array: '[]',
				},
			],
			[
				{
					type: 'books',
					fields: { assets: ['document'], title: 'title', date_consumed: 'date_consumed' },
				},
			]
		)

		mocks.isImage.mockReturnValue(false)
		mocks.getAssetDir.mockReturnValue('books/1')
		mocks.getAssetPath.mockImplementation(
			(type, id, asset) => `${type}/${id}/${asset.split('/').pop()}`
		)

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.mkdir).toHaveBeenCalledWith('/path/to/out/books/1', { recursive: true })
		expect(mocks.copyFile).toHaveBeenCalledWith(
			'/path/to/document.pdf',
			'/path/to/out/books/1/document.pdf'
		)
		expect(mocks.generateVariantJobs).not.toHaveBeenCalled()
	})

	test('should handle errors during variant generation', async () => {
		setupDefaultMocks(
			[
				{
					id: '1',
					type: 'books',
					date_updated: 100,
					date_added: 50,
					frontmatter_json: '{"image": "/path/to/image.jpg"}',
					file_path: 'book.md',
					note_markdown: '',
					assets_json_array: '[]',
				},
			],
			[
				{
					type: 'books',
					fields: { media: 'image', title: 'title', date_consumed: 'date_consumed' },
				},
			]
		)

		mocks.isImage.mockReturnValue(true)
		mocks.getAssetDir.mockReturnValue('books/1')
		mocks.getAssetPath.mockImplementation(
			(type, id, asset) => `${type}/${id}/${asset.split('/').pop()}`
		)
		mocks.generateVariantJobs.mockRejectedValue(new Error('test error'))

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(consoleErrorSpy).toHaveBeenCalledOnce()

		consoleErrorSpy.mockRestore()
	})

	test('should do nothing if there are no items to process', async () => {
		setupDefaultMocks(
			[],
			[
				{
					type: 'books',
					fields: { media: 'image', title: 'title', date_consumed: 'date_consumed' },
				},
			]
		)

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.copyFile).not.toHaveBeenCalled()
		expect(mocks.generateVariantJobs).not.toHaveBeenCalled()
	})

	test('should force variant generation', async () => {
		setupDefaultMocks(
			[
				{
					id: '1',
					type: 'books',
					date_updated: 0,
					date_added: 0,
					frontmatter_json: '{"image": "/path/to/image.jpg"}',
					file_path: 'book.md',
					note_markdown: '',
					assets_json_array: '[]',
				},
			],
			[
				{
					type: 'books',
					fields: { media: 'image', title: 'title', date_consumed: 'date_consumed' },
				},
			]
		)
		mocks.getLastRunFor.mockResolvedValue(new Date())
		mocks.isImage.mockReturnValue(true)

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {
			force: true,
		})

		expect(mocks.copyFile).toHaveBeenCalledOnce()
		expect(mocks.generateVariantJobs).toHaveBeenCalledOnce()
	})

	test('should limit variant generation', async () => {
		setupDefaultMocks(
			[
				{
					id: '1',
					type: 'books',
					date_updated: 100,
					date_added: 50,
					frontmatter_json: '{"image": "/path/to/image.jpg"}',
					file_path: 'book.md',
					note_markdown: '',
					assets_json_array: '[]',
				},
				{
					id: '2',
					type: 'books',
					date_updated: 100,
					date_added: 50,
					frontmatter_json: '{"image": "/path/to/image2.jpg"}',
					file_path: 'book2.md',
					note_markdown: '',
					assets_json_array: '[]',
				},
			],
			[
				{
					type: 'books',
					fields: { media: 'image', title: 'title', date_consumed: 'date_consumed' },
				},
			]
		)
		mocks.isImage.mockReturnValue(true)

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', { limit: 1 })

		expect(mocks.copyFile).toHaveBeenCalledOnce()
		expect(mocks.generateVariantJobs).toHaveBeenCalledOnce()
	})

	test('should handle items with no assets', async () => {
		setupDefaultMocks(
			[
				{
					id: '1',
					type: 'books',
					date_updated: 100,
					date_added: 50,
					frontmatter_json: '{}',
					file_path: 'book.md',
					note_markdown: '',
					assets_json_array: '[]',
				},
			],
			[
				{
					type: 'books',
					fields: { media: 'image', title: 'title', date_consumed: 'date_consumed' },
				},
			]
		)

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.copyFile).not.toHaveBeenCalled()
		expect(mocks.generateVariantJobs).not.toHaveBeenCalled()
	})

	test('should handle errors during toFile', async () => {
		setupDefaultMocks(
			[
				{
					id: '1',
					type: 'books',
					date_updated: 100,
					date_added: 50,
					frontmatter_json: '{"image": "/path/to/image.jpg"}',
					file_path: 'book.md',
					note_markdown: '',
					assets_json_array: '[]',
				},
			],
			[
				{
					type: 'books',
					fields: { media: 'image', title: 'title', date_consumed: 'date_consumed' },
				},
			]
		)

		mocks.isImage.mockReturnValue(true)
		mocks.getAssetDir.mockReturnValue('books/1')
		mocks.getAssetPath.mockImplementation(
			(type, id, asset) => `${type}/${id}/${asset.split('/').pop()}`
		)
		const toFileMock = vi.fn().mockRejectedValue(new Error('toFile error'))
		mocks.generateVariantJobs.mockResolvedValue([
			{ sharp: { toFile: toFileMock } as unknown as Sharp, size: 125, format: 'jpg' },
		])

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(consoleErrorSpy).toHaveBeenCalledOnce()

		consoleErrorSpy.mockRestore()
	})

	test('should handle piece with no assets field', async () => {
		setupDefaultMocks(
			[
				{
					id: '1',
					type: 'books',
					date_updated: 100,
					date_added: 50,
					frontmatter_json: '{"image": "/path/to/image.jpg"}',
					file_path: 'book.md',
					note_markdown: '',
					assets_json_array: '[]',
				},
			],
			[
				{
					type: 'books',
					fields: { media: 'image', title: 'title', date_consumed: 'date_consumed' },
				},
			]
		)

		mocks.isImage.mockReturnValue(true)
		mocks.getAssetDir.mockReturnValue('books/1')
		mocks.getAssetPath.mockImplementation(
			(type, id, asset) => `${type}/${id}/${asset.split('/').pop()}`
		)

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.copyFile).toHaveBeenCalledOnce()
	})

	test('should handle no variant jobs', async () => {
		setupDefaultMocks(
			[
				{
					id: '1',
					type: 'books',
					date_updated: 100,
					date_added: 50,
					frontmatter_json: '{"image": "/path/to/image.jpg"}',
					file_path: 'book.md',
					note_markdown: '',
					assets_json_array: '[]',
				},
			],
			[
				{
					type: 'books',
					fields: { media: 'image', title: 'title', date_consumed: 'date_consumed' },
				},
			]
		)

		mocks.isImage.mockReturnValue(true)
		mocks.getAssetDir.mockReturnValue('books/1')
		mocks.getAssetPath.mockImplementation(
			(type, id, asset) => `${type}/${id}/${asset.split('/').pop()}`
		)
		mocks.generateVariantJobs.mockResolvedValue([])

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.copyFile).toHaveBeenCalledOnce()
	})

	test('should handle piece with no media field', async () => {
		setupDefaultMocks(
			[
				{
					id: '1',
					type: 'books',
					date_updated: 100,
					date_added: 50,
					frontmatter_json: '{"images": ["/path/to/image.jpg"]}',
					file_path: 'book.md',
					note_markdown: '',
					assets_json_array: '[]',
				},
			],
			[
				{
					type: 'books',
					fields: { assets: ['images'], title: 'title', date_consumed: 'date_consumed' },
				},
			]
		)

		mocks.isImage.mockReturnValue(true)
		mocks.getAssetDir.mockReturnValue('books/1')
		mocks.getAssetPath.mockImplementation(
			(type, id, asset) => `${type}/${id}/${asset.split('/').pop()}`
		)

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.copyFile).toHaveBeenCalledOnce()
	})

	test('should do nothing if there are no pieces in config', async () => {
		setupDefaultMocks(
			[
				{
					id: '1',
					type: 'books',
					date_updated: 100,
					date_added: 50,
					frontmatter_json: '{"image": "/path/to/image.jpg"}',
					file_path: 'book.md',
					note_markdown: '',
					assets_json_array: '[]',
				},
			],
			[] // No pieces in config
		)

		await generateVariants('/path/to/config.yaml', '/path/to/luzzle', '/path/to/out', {})

		expect(mocks.copyFile).not.toHaveBeenCalled()
	})
})
