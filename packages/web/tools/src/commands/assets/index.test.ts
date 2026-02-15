import { describe, test, expect, vi, afterEach } from 'vitest'
import { getLastRunFor, setLastRunFor } from '../../lib/lastRun.js'
import { getConfig } from '../../lib/config.js'
import { getDatabase } from '../../lib/database.js'
import { LuzzleSelectable, Pieces, StorageFileSystem } from '@luzzle/core'
import { mockKysely } from '../sqlite/database.mock.js'
import { writeFile, mkdir } from 'fs/promises'
import { generateVariantJobs } from './variants.js'
import {
	getAssetDir,
	getAssetPath,
	isImage,
	type Config,
	generateAssetKey,
} from '@luzzle/web.utils'
import generateAssets from './index.js'
import { Sharp } from 'sharp'

vi.mock('../../lib/lastRun.js')
vi.mock('../../lib/config.js')
vi.mock('../../lib/database.js')
vi.mock('@luzzle/core')
vi.mock('fs/promises')
vi.mock('./variants.js')
vi.mock('@luzzle/web.utils')

const mocks = {
	getLastRunFor: vi.mocked(getLastRunFor),
	setLastRunFor: vi.mocked(setLastRunFor),
	getConfig: vi.mocked(getConfig),
	getDatabase: vi.mocked(getDatabase),
	Pieces: vi.mocked(Pieces),
	StorageFileSystem: vi.mocked(StorageFileSystem),
	generateVariantJobs: vi.mocked(generateVariantJobs),
	getAssetPath: vi.mocked(getAssetPath),
	getAssetDir: vi.mocked(getAssetDir),
	generateAssetKey: vi.mocked(generateAssetKey),
	isImage: vi.mocked(isImage),
	mkdir: vi.mocked(mkdir),
	writeFile: vi.mocked(writeFile),
}

const setupDefaultMocks = (
	items: LuzzleSelectable<'pieces_items'>[] = [],
	pieces: Config['pieces'] = []
) => {
	const config = {
		paths: { database: 'db.sqlite' },
		pieces: pieces,
		assets: { salt: 'test-salt' },
	} as unknown as Config
	mocks.getConfig.mockReturnValue(config)

	const mockDb = mockKysely()
	vi.spyOn(mockDb.queries, 'execute').mockResolvedValue(items)
	mocks.getDatabase.mockReturnValue(mockDb.db)

	mocks.getLastRunFor.mockResolvedValue(new Date(0))
	mocks.generateAssetKey.mockImplementation((path) => `key-${path}`)

	const mockStorage = { readFileSync: vi.fn() } as unknown as StorageFileSystem
	const mockPieces = {
		getPieceAsset: vi.fn(() => Promise.resolve(Buffer.from('asset_content'))),
	} as unknown as Pieces
	mocks.StorageFileSystem.mockReturnValue(mockStorage)
	mocks.Pieces.mockReturnValue(mockPieces)
	return { mockPieces, config }
}

describe('generateAssets', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should copy assets and generate variants for image assets', async () => {
		const { mockPieces, config } = setupDefaultMocks(
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
		mocks.getAssetDir.mockImplementation((type, key) => `${type}/${key}`)
		mocks.getAssetPath.mockImplementation(
			(type, id, asset) => `${type}/${id}/${asset.split('/').pop()}`
		)

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
			},
			config
		)

		expect(mocks.mkdir).toHaveBeenCalledWith('/path/to/out/books/key-book.md', { recursive: true })
		expect(mockPieces.getPieceAsset).toHaveBeenCalledWith('/path/to/image.jpg')
		expect(mockPieces.getPieceAsset).toHaveBeenCalledWith('/path/to/document.pdf')
		expect(mocks.writeFile).toHaveBeenCalledWith(
			'/path/to/out/books/key-book.md/image.jpg',
			Buffer.from('asset_content')
		)
		expect(mocks.writeFile).toHaveBeenCalledWith(
			'/path/to/out/books/key-book.md/document.pdf',
			Buffer.from('asset_content')
		)
		expect(mocks.generateVariantJobs).toHaveBeenCalledOnce()
	})

	test('should only copy assets if they are not images', async () => {
		const { mockPieces, config } = setupDefaultMocks(
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
		mocks.getAssetDir.mockImplementation((type, key) => `${type}/${key}`)
		mocks.getAssetPath.mockImplementation(
			(type, id, asset) => `${type}/${id}/${asset.split('/').pop()}`
		)

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
			},
			config
		)

		expect(mocks.mkdir).toHaveBeenCalledWith('/path/to/out/books/key-book.md', { recursive: true })
		expect(mockPieces.getPieceAsset).toHaveBeenCalledWith('/path/to/document.pdf')
		expect(mocks.writeFile).toHaveBeenCalledWith(
			'/path/to/out/books/key-book.md/document.pdf',
			Buffer.from('asset_content')
		)
		expect(mocks.generateVariantJobs).not.toHaveBeenCalled()
	})

	test('should handle errors when copying assets', async () => {
		const { config } = setupDefaultMocks(
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

		mocks.writeFile.mockRejectedValueOnce(new Error('Write error'))
		mocks.isImage.mockReturnValue(false)
		mocks.getAssetDir.mockImplementation((type, key) => `${type}/${key}`)
		mocks.getAssetPath.mockImplementation(
			(type, id, asset) => `${type}/${id}/${asset.split('/').pop()}`
		)

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
			},
			config
		)

		expect(consoleErrorSpy).toHaveBeenCalledOnce()
		expect(mocks.generateVariantJobs).not.toHaveBeenCalled()

		consoleErrorSpy.mockRestore()
	})

	test('should handle errors during variant generation', async () => {
		const { config } = setupDefaultMocks(
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

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
			},
			config
		)

		expect(consoleErrorSpy).toHaveBeenCalledOnce()

		consoleErrorSpy.mockRestore()
	})

	test('should do nothing if there are no items to process', async () => {
		const { config } = setupDefaultMocks(
			[],
			[
				{
					type: 'books',
					fields: { media: 'image', title: 'title', date_consumed: 'date_consumed' },
				},
			]
		)

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
			},
			config
		)

		expect(mocks.writeFile).not.toHaveBeenCalled()
		expect(mocks.generateVariantJobs).not.toHaveBeenCalled()
	})

	test('should force variant generation', async () => {
		const { mockPieces, config } = setupDefaultMocks(
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

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
				force: true,
			},
			config
		)

		expect(mockPieces.getPieceAsset).toHaveBeenCalledOnce()
		expect(mocks.writeFile).toHaveBeenCalledOnce()
		expect(mocks.generateVariantJobs).toHaveBeenCalledOnce()
	})

	test('should force variant generation for one id', async () => {
		const { mockPieces, config } = setupDefaultMocks(
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

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
				id: '1',
			},
			config
		)

		expect(mockPieces.getPieceAsset).toHaveBeenCalledOnce()
		expect(mocks.writeFile).toHaveBeenCalledOnce()
		expect(mocks.generateVariantJobs).toHaveBeenCalledOnce()
	})

	test('should handle items with no assets', async () => {
		const { config } = setupDefaultMocks(
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

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
			},
			config
		)

		expect(mocks.writeFile).not.toHaveBeenCalled()
		expect(mocks.generateVariantJobs).not.toHaveBeenCalled()
	})

	test('should handle errors during toFile', async () => {
		const { config } = setupDefaultMocks(
			[
				{
					id: '1',
					type: 'books',
					date_updated: 100,
					date_added: 50,
					frontmatter_json: '{"image": "/path/to/image.jpg"}',
					file_path: 'book..md',
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
			{
				sharp: { toFile: toFileMock } as unknown as Sharp,
				width: 125,
				format: 'jpg',
			},
		])

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
			},
			config
		)

		expect(consoleErrorSpy).toHaveBeenCalledOnce()

		consoleErrorSpy.mockRestore()
	})

	test('should handle piece with no assets field', async () => {
		const { mockPieces, config } = setupDefaultMocks(
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

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
			},
			config
		)

		expect(mockPieces.getPieceAsset).toHaveBeenCalledOnce()
		expect(mocks.writeFile).toHaveBeenCalledOnce()
	})

	test('should filter items by id', async () => {
		const { mockPieces, config } = setupDefaultMocks(
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
		mocks.getAssetDir.mockReturnValue('books/1')
		mocks.getAssetPath.mockImplementation(
			(type, id, asset) => `${type}/${id}/${asset.split('/').pop()}`
		)

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
				id: '1',
			},
			config
		)

		expect(mockPieces.getPieceAsset).toHaveBeenCalledOnce()
		expect(mocks.writeFile).toHaveBeenCalledOnce()
		expect(mockPieces.getPieceAsset).toHaveBeenCalledWith('/path/to/image.jpg')
		expect(mocks.setLastRunFor).not.toHaveBeenCalled()
	})

	test('should handle no variant jobs', async () => {
		const { mockPieces, config } = setupDefaultMocks(
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

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
			},
			config
		)

		expect(mockPieces.getPieceAsset).toHaveBeenCalledOnce()
		expect(mocks.writeFile).toHaveBeenCalledOnce()
	})

	test('should handle piece with no media field', async () => {
		const { mockPieces, config } = setupDefaultMocks(
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

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
			},
			config
		)

		expect(mockPieces.getPieceAsset).toHaveBeenCalledOnce()
		expect(mocks.writeFile).toHaveBeenCalledOnce()
	})

	test('should do nothing if there are no pieces in config', async () => {
		const { config } = setupDefaultMocks(
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

		await generateAssets(
			{
				archiveDir: '/path/to/luzzle',
				outDir: '/path/to/out',
			},
			config
		)

		expect(mocks.writeFile).not.toHaveBeenCalled()
	})
})