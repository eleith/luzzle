import { describe, test, expect, vi, afterEach } from 'vitest'
import { generateVariantJobs } from './variants.js'
import Sharp from 'sharp'
import type { Pieces } from '@luzzle/core'
import { makeLogger } from '../../../test/logger.js'

vi.mock('sharp')

describe('generateVariantJobs', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('propagates asset-read failure instead of returning successful zero jobs', async () => {
		const mockPieces = {
			getPieceAsset: vi.fn().mockRejectedValue(new Error('test error')),
		} as unknown as Pieces
		const logger = makeLogger()

		await expect(
			generateVariantJobs(
				'path/to/file.jpg',
				'image.jpg',
				mockPieces,
				[100],
				['avif', 'jpg'],
				logger
			)
		).rejects.toThrow('test error')
		expect(logger.error).toHaveBeenCalledOnce()
	})

	test('propagates a Sharp preparation error rather than returning partial jobs', async () => {
		const error = new Error('cannot prepare image')
		vi.mocked(Sharp).mockImplementationOnce(() => {
			throw error
		})
		const mockPieces = {
			getPieceAsset: vi.fn().mockResolvedValue('asset_content'),
		} as unknown as Pieces
		const logger = makeLogger()
		await expect(
			generateVariantJobs('book.md', 'image.jpg', mockPieces, [100], ['avif', 'jpg'], logger)
		).rejects.toBe(error)
		expect(logger.error).toHaveBeenCalledWith(
			'error generating variant jobs for book.md asset at image.jpg',
			expect.objectContaining({ error: error.message })
		)
	})

	test('should generate variant jobs for an image asset', async () => {
		const mockPieces = { getPieceAsset: vi.fn(() => 'asset_content') } as unknown as Pieces
		const logger = makeLogger()

		const mockSharp = {
			clone: vi.fn().mockReturnThis(),
			resize: vi.fn().mockReturnThis(),
			toFormat: vi.fn().mockReturnThis(),
		}
		vi.mocked(Sharp).mockReturnValue(mockSharp as unknown as Sharp.Sharp)

		const jobs = await generateVariantJobs(
			'path/to/file.jpg',
			'image.jpg',
			mockPieces,
			[100, 200],
			['avif', 'jpg'],
			logger
		)

		expect(mockPieces.getPieceAsset).toHaveBeenCalledWith('image.jpg')
		expect(Sharp).toHaveBeenCalledWith('asset_content')
		expect(mockSharp.clone).toHaveBeenCalledTimes(4)
		expect(mockSharp.resize).toHaveBeenCalledWith({ width: 100 })
		expect(mockSharp.resize).toHaveBeenCalledWith({ width: 200 })
		expect(mockSharp.toFormat).toHaveBeenCalledWith('avif', { quality: 45, effort: 4 })
		expect(mockSharp.toFormat).toHaveBeenCalledWith('jpg', { quality: 75, mozjpeg: true })
		expect(jobs).toHaveLength(4)
	})
})
