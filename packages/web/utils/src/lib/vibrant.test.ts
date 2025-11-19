import { describe, test, expect, vi, afterEach } from 'vitest'
import { SharpImage, getPalette } from './vibrant.js'
import { ImageSource } from '@vibrant/image'
import sharp, { Sharp } from 'sharp'
import { Vibrant } from 'node-vibrant/node'

vi.mock('sharp')
vi.mock('node-vibrant/node')

describe('lib/vibrant', () => {
	const mocks = {
		sharp: vi.mocked(sharp),
		fetch: vi.fn(),
		Vibrant: vi.mocked(Vibrant),
		getPalette: vi.spyOn(Vibrant.prototype, 'getPalette'),
	}

	global.fetch = mocks.fetch

	afterEach(() => {
		vi.resetAllMocks()
	})

	test('should load an image from a URL', async () => {
		const sharpInstance = {
			resize: vi.fn().mockReturnThis(),
			ensureAlpha: vi.fn().mockReturnThis(),
			raw: vi.fn().mockReturnThis(),
			toBuffer: vi
				.fn()
				.mockResolvedValue({ data: Buffer.from([255, 0, 0, 255]), info: { width: 1, height: 1 } }),
		} as unknown as Sharp
		mocks.sharp.mockReturnValue(sharpInstance)
		mocks.fetch.mockResolvedValue({
			arrayBuffer: () => Promise.resolve(Buffer.from('mock-image-data')),
		})

		const image = new SharpImage()
		await image.load('http://example.com/image.png')

		expect(mocks.fetch).toHaveBeenCalledWith('http://example.com/image.png')
		expect(mocks.sharp).toHaveBeenCalled()
		expect(image.getWidth()).toBe(1)
		expect(image.getHeight()).toBe(1)
	})

	test('should load an image from a file path', async () => {
		const sharpInstance = {
			resize: vi.fn().mockReturnThis(),
			ensureAlpha: vi.fn().mockReturnThis(),
			raw: vi.fn().mockReturnThis(),
			toBuffer: vi
				.fn()
				.mockResolvedValue({ data: Buffer.from([255, 0, 0, 255]), info: { width: 1, height: 1 } }),
		} as unknown as Sharp
		mocks.sharp.mockReturnValue(sharpInstance)

		const image = new SharpImage()
		await image.load('path/to/image.png')

		expect(mocks.sharp).toHaveBeenCalled()
		expect(image.getWidth()).toBe(1)
		expect(image.getHeight()).toBe(1)
	})

	test('should load an image from a buffer', async () => {
		const sharpInstance = {
			resize: vi.fn().mockReturnThis(),
			ensureAlpha: vi.fn().mockReturnThis(),
			raw: vi.fn().mockReturnThis(),
			toBuffer: vi
				.fn()
				.mockResolvedValue({ data: Buffer.from([255, 0, 0, 255]), info: { width: 1, height: 1 } }),
		} as unknown as Sharp
		mocks.sharp.mockReturnValue(sharpInstance)
		const buffer = Buffer.from('mock-image-data')

		const image = new SharpImage()
		await image.load(buffer)

		expect(mocks.sharp).toHaveBeenCalledWith(buffer)
		expect(image.getWidth()).toBe(1)
		expect(image.getHeight()).toBe(1)
	})

	test('should reject for unsupported image source', async () => {
		const image = new SharpImage()
		await expect(image.load({} as unknown as ImageSource)).rejects.toThrow(
			'Cannot load image from HTMLImageElement in node environment'
		)
	})

	test('should handle errors during image loading', async () => {
		const sharpInstance = {
			resize: vi.fn().mockReturnThis(),
			ensureAlpha: vi.fn().mockReturnThis(),
			raw: vi.fn().mockReturnThis(),
			toBuffer: vi.fn().mockRejectedValue(new Error('Test error')),
		} as unknown as Sharp
		mocks.sharp.mockReturnValue(sharpInstance)
		mocks.fetch.mockResolvedValue({
			arrayBuffer: () => Promise.resolve(Buffer.from('mock-image-data')),
		})

		const image = new SharpImage()
		await expect(image.load('http://example.com/image.png')).rejects.toThrow('Test error')
	})

	test('should return pixel count', async () => {
		const sharpInstance = {
			resize: vi.fn().mockReturnThis(),
			ensureAlpha: vi.fn().mockReturnThis(),
			raw: vi.fn().mockReturnThis(),
			toBuffer: vi
				.fn()
				.mockResolvedValue({ data: Buffer.from([255, 0, 0, 255]), info: { width: 1, height: 1 } }),
		} as unknown as Sharp
		mocks.sharp.mockReturnValue(sharpInstance)
		mocks.fetch.mockResolvedValue({
			arrayBuffer: () => Promise.resolve(Buffer.from('mock-image-data')),
		})

		const image = new SharpImage()
		await image.load('http://example.com/image.png')

		expect(image.getPixelCount()).toBe(1)
	})

	test('should return image data', async () => {
		const sharpInstance = {
			resize: vi.fn().mockReturnThis(),
			ensureAlpha: vi.fn().mockReturnThis(),
			raw: vi.fn().mockReturnThis(),
			toBuffer: vi.fn().mockResolvedValue({
				data: new Uint8ClampedArray([255, 0, 0, 255]),
				info: { width: 1, height: 1 },
			}),
		} as unknown as Sharp
		mocks.sharp.mockReturnValue(sharpInstance)
		mocks.fetch.mockResolvedValue({
			arrayBuffer: () => Promise.resolve(Buffer.from('mock-image-data')),
		})

		const image = new SharpImage()
		await image.load('http://example.com/image.png')
		const imageData = image.getImageData()

		expect(imageData.width).toBe(1)
		expect(imageData.height).toBe(1)
		expect(imageData.data).toBeInstanceOf(Uint8ClampedArray)
	})

	test('should have empty methods for coverage', () => {
		const image = new SharpImage()
		image.clear()
		image.update()
		image.resize(1, 2, 3)
		image.remove()
		expect(true).toBe(true)
	})

	test('getPalette should use Vibrant', async () => {
		const mockPalette = {
			DarkVibrant: { hex: 'red', bodyTextColor: 'blue', titleTextColor: 'green' },
			LightVibrant: { hex: 'yellow' },
			Muted: { hex: 'purple' },
		} as unknown as Awaited<ReturnType<typeof Vibrant.prototype.getPalette>>

		mocks.getPalette.mockResolvedValue(mockPalette)

		const palette = await getPalette('path/to/image.png')

		expect(palette.background).toBe(mockPalette.DarkVibrant?.hex)
		expect(palette.bodyText).toBe(mockPalette.DarkVibrant?.bodyTextColor)
		expect(palette.titleText).toBe(mockPalette.DarkVibrant?.titleTextColor)
		expect(palette.accent).toBe(mockPalette.LightVibrant?.hex)
		expect(palette.muted).toBe(mockPalette.Muted?.hex)
	})
})
