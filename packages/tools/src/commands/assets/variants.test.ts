import { describe, test, expect, vi, afterEach } from 'vitest'
import { generateVariantJobs } from './variants.js'
import { Pieces } from '@luzzle/cli'
import Sharp from 'sharp'
import { LuzzleSelectable } from '@luzzle/core'

vi.mock('sharp')

describe('generateVariantJobs', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	test('should return an empty array if getPieceAsset fails', async () => {
		const mockPieces = {
			getPieceAsset: vi.fn().mockRejectedValue(new Error('test error')),
		} as unknown as Pieces
		const mockItem = {
			id: '1',
			type: 'test',
			file_path: 'path/to/file.jpg',
		} as unknown as LuzzleSelectable<'pieces_items'>

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		const jobs = await generateVariantJobs(mockItem, 'image.jpg', mockPieces, [100], ['avif', 'jpg'])

		expect(jobs).toEqual([])
		expect(consoleErrorSpy).toHaveBeenCalledOnce()

		consoleErrorSpy.mockRestore()
	})

	test('should generate variant jobs for an image asset', async () => {
		const mockPieces = { getPieceAsset: vi.fn(() => 'asset_content') } as unknown as Pieces
		const mockItem = {
			id: '1',
			type: 'test',
			file_path: 'path/to/file.jpg',
		} as unknown as LuzzleSelectable<'pieces_items'>

		const mockSharp = {
			clone: vi.fn().mockReturnThis(),
			resize: vi.fn().mockReturnThis(),
			toFormat: vi.fn().mockReturnThis(),
		}
		vi.mocked(Sharp).mockReturnValue(mockSharp as unknown as Sharp.Sharp)

		const jobs = await generateVariantJobs(
			mockItem,
			'image.jpg',
			mockPieces,
			[100, 200],
			['avif', 'jpg']
		)

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
