import { describe, test, expect } from 'vitest'
import { getVariantPath } from './variants.js'

describe('getVariantPath', () => {
	test('should return the path to the asset', () => {
		const path = getVariantPath('books', '1', 'image.jpg')
		expect(path).toBe('books/1/image.jpg')
	})

	test('should return the path to the variant', () => {
		const path = getVariantPath('books', '1', 'image.jpg', 'avif', 100)
		expect(path).toBe('books/1/image.w100.avif')
	})
})
