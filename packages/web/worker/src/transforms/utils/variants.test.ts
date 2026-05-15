import { describe, test, expect, vi, afterEach } from 'vitest'
import { generateVariantJobs } from './variants.js'
import Sharp from 'sharp'
import { Pieces } from '@luzzle/core'
import { makeLogger } from '../../../test/logger.js'

vi.mock('sharp')

describe('generateVariantJobs', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should return an empty array if getPieceAsset fails', async () => {
		const mockPieces = {
			getPieceAsset: vi.fn().mockRejectedValue(new Error('test error')),
		} as unknown as Pieces
		const logger = makeLogger()

		const jobs = await generateVariantJobs(
			'path/to/file.jpg',
			'image.jpg',
			mockPieces,
			[100],
			['avif', 'jpg'],
			logger
		)

		expect(jobs).toEqual([])
		expect(logger.error).toHaveBeenCalledOnce()
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
