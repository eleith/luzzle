import { describe, test, vi, afterEach, expect } from 'vitest'
import { generateVariantJobs, generateVariantForFieldAsset } from './variants.js'
import { Pieces, PieceMarkdown, PieceFrontmatter, Storage } from '@luzzle/cli'
import Sharp from 'sharp'

vi.mock('@luzzle/cli')
vi.mock('sharp', () => {
	const mockSharp = {
		clone: vi.fn().mockReturnThis(),
		resize: vi.fn().mockReturnThis(),
		toFormat: vi.fn().mockReturnThis(),
		toBuffer: vi.fn().mockResolvedValue(Buffer.from('test')),
	}
	return {
		__esModule: true,
		default: vi.fn(() => mockSharp),
	}
})

describe('generate-image-variants/variants', () => {
	const mocks = {
		Sharp: vi.mocked(Sharp),
	}

	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})
	})

	test('should generate variant jobs', async () => {
		const pieces = new Pieces({} as unknown as Storage)
		const asset = 'test.jpg'
		const sizes = [100, 200]
		const formats: ('avif' | 'jpg')[] = ['avif', 'jpg']

		const jobs = await generateVariantJobs(asset, pieces, sizes, formats)

		expect(jobs).toHaveLength(4)
	})

	test('should generate variant for field asset', async () => {
		const pieces = new Pieces({} as unknown as Storage)
		const markdown = {
			piece: 'test',
			filePath: 'path/to.md',
			frontmatter: {
				image: 'test.jpg',
			},
		} as PieceMarkdown<PieceFrontmatter>
		const field = 'image'
		const size = 100
		const format = 'jpg'

		const buffer = await generateVariantForFieldAsset(markdown, pieces, field, size, format)

		expect(buffer).toBeDefined()
	})

	test('should throw an error if asset field is missing', async () => {
		const pieces = new Pieces({} as unknown as Storage)
		const markdown = {
			piece: 'test',
			frontmatter: {},
		} as PieceMarkdown<PieceFrontmatter>
		const field = 'image'
		const size = 100
		const format = 'jpg'

		await expect(
			generateVariantForFieldAsset(markdown, pieces, field, size, format)
		).rejects.toThrow()
	})

	test('should throw an error if asset is not an image', async () => {
		const pieces = new Pieces({} as unknown as Storage)
		const markdown = {
			piece: 'test',
			filePath: 'path/to.md',
			frontmatter: {
				image: 'test.txt',
			},
		} as PieceMarkdown<PieceFrontmatter>
		const field = 'image'
		const size = 100
		const format = 'jpg'

		await expect(
			generateVariantForFieldAsset(markdown, pieces, field, size, format)
		).rejects.toThrow()
	})
})

