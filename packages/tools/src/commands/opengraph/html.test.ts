import { describe, test, expect, vi, afterEach } from 'vitest'
import {
	bufferToBase64,
	countWords,
	getDynamicFontSize,
	getHashIndexFor,
	extractImage,
} from './html.js'
import Sharp from 'sharp'
import { Vibrant } from 'node-vibrant/node'

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
vi.mock('node-vibrant/node')

describe('generate-open-graph/html', () => {
	const mocks = {
		Sharp: vi.mocked(Sharp),
		Vibrant: vi.mocked(Vibrant),
	}

	afterEach(() => {
		Object.values(mocks).forEach((mock) => {
			mock.mockReset()
		})
	})

	test('should convert a buffer to a base64 string', () => {
		const buffer = Buffer.from('test')
		const result = bufferToBase64(buffer, 'text', 'plain')
		expect(result).toBe('data:text/plain;base64,dGVzdA==')
	})

	test('should count the words in a string', () => {
		const text = 'this is a test'
		const result = countWords(text)
		expect(result).toBe(4)
	})

	test('should count the words in a string even if empty', () => {
		const text = ''
		const result = countWords(text)
		expect(result).toBe(0)
	})

	test('should calculate the dynamic font size', () => {
		const title = 'a long title that should be smaller'
		const result = getDynamicFontSize(title, 20, 10)
		expect(result).toBe(12)
	})

	test('should get a hash index for a word', () => {
		const word = 'test'
		const result = getHashIndexFor(word, 10)
		expect(result).toBe(8)
	})

	test('should extract image and palette', async () => {
		const buffer = Buffer.from('image data')
		const mockVibrant = {
			getPalette: vi.fn().mockResolvedValue({}),
		}
		mocks.Vibrant.mockReturnValue(mockVibrant as unknown as Vibrant)

		const result = await extractImage(buffer)

		expect(result.base64).toBe('data:image/jpeg;base64,dGVzdA==')
		expect(result.palette).toBeDefined()
		expect(mocks.Sharp).toHaveBeenCalledWith(buffer)
		expect(mockVibrant.getPalette).toHaveBeenCalledOnce()
	})

	test('should extract image and palette with options', async () => {
		const buffer = Buffer.from('image data')
		const mockVibrant = {
			getPalette: vi.fn().mockResolvedValue({}),
		}
		const options = { width: 100, height: 100, format: 'png' as const }
		mocks.Vibrant.mockReturnValue(mockVibrant as unknown as Vibrant)

		const result = await extractImage(buffer, options)

		expect(result.base64).toBe('data:image/png;base64,dGVzdA==')
		expect(result.palette).toBeDefined()
		expect(mocks.Sharp).toHaveBeenCalledWith(buffer)
		expect(mockVibrant.getPalette).toHaveBeenCalledOnce()
	})
})
