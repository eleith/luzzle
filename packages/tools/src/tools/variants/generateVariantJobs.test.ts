import { describe, test, expect, vi, afterEach } from 'vitest'
import { generateVariantJobs } from './variants.js'
import { Pieces } from '@luzzle/cli'
import Sharp from 'sharp'

vi.mock('sharp')

describe('generateVariantJobs', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should throw an error if getPieceAsset fails', async () => {
		const mockPieces = { getPieceAsset: vi.fn().mockRejectedValue(new Error('test error')) } as unknown as Pieces

		await expect(generateVariantJobs('image.jpg', mockPieces, [100], ['avif', 'jpg'])).rejects.toThrowError('test error')
	})

	test('should generate variant jobs for an image asset', async () => {
		const mockPieces = { getPieceAsset: vi.fn(() => 'asset_content') } as unknown as Pieces
		const mockSharp = { clone: vi.fn().mockReturnThis(), resize: vi.fn().mockReturnThis(), toFormat: vi.fn().mockReturnThis() }
		vi.mocked(Sharp).mockReturnValue(mockSharp as unknown as Sharp.Sharp)

		const jobs = await generateVariantJobs('image.jpg', mockPieces, [100, 200], ['avif', 'jpg'])

		expect(mockPieces.getPieceAsset).toHaveBeenCalledWith('image.jpg')
		expect(Sharp).toHaveBeenCalledWith('asset_content')
		expect(mockSharp.clone).toHaveBeenCalledTimes(4)
		expect(mockSharp.resize).toHaveBeenCalledWith({ width: 100 })
		expect(mockSharp.resize).toHaveBeenCalledWith({ width: 200 })
		expect(mockSharp.toFormat).toHaveBeenCalledWith('avif')
		expect(mockSharp.toFormat).toHaveBeenCalledWith('jpg')
		expect(jobs).toHaveLength(4)
	})
})
