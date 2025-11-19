import { describe, test, expect } from 'vitest'
import {
	getImageAssetPath,
	isImage,
	getAssetPath,
	getAssetDir,
	getOpenGraphPath,
} from './assets.js'

describe('./lib/assets.ts', () => {
	test('should return the path to the asset directory', () => {
		const path = getAssetDir('books', '1')
		expect(path).toBe('books/1')
	})

	test('should return the path to the variant for size s', () => {
		const path = getImageAssetPath('books', '1', 'image.jpg', 100, 'jpg')
		expect(path).toBe('books/1/image.s.jpg')
	})

	test('should return the path to the variant for size m', () => {
		const path = getImageAssetPath('books', '1', 'image.jpg', 200, 'jpg')
		expect(path).toBe('books/1/image.m.jpg')
	})

	test('should return the path to the variant for size l', () => {
		const path = getImageAssetPath('books', '1', 'image.jpg', 350, 'jpg')
		expect(path).toBe('books/1/image.l.jpg')
	})

	test('should return the path to the variant for size xl', () => {
		const path = getImageAssetPath('books', '1', 'image.jpg', 600, 'jpg')
		expect(path).toBe('books/1/image.xl.jpg')
	})

	test('should return the path to the variant for size xl when width is larger than 1000', () => {
		const path = getImageAssetPath('books', '1', 'image.jpg', 1200, 'jpg')
		expect(path).toBe('books/1/image.xl.jpg')
	})

	test('should return the path to the variant with avif format', () => {
		const path = getImageAssetPath('books', '1', 'image.jpg', 350, 'avif')
		expect(path).toBe('books/1/image.l.avif')
	})

	test('should return false if the asset is not an image', () => {
		expect(isImage('document.pdf')).toBe(false)
	})

	test('should return true if the asset is an image', () => {
		expect(isImage('image.jpg')).toBe(true)
		expect(isImage('image.jpeg')).toBe(true)
		expect(isImage('image.png')).toBe(true)
		expect(isImage('image.webp')).toBe(true)
		expect(isImage('image.avif')).toBe(true)
		expect(isImage('image.gif')).toBe(true)
	})

	test('should return false if the asset has no extension', () => {
		expect(isImage('image')).toBe(false)
	})

	test('isImage should handle asset without matching path', () => {
		expect(isImage('')).toBe(false)
		expect(isImage('invalid-asset-name')).toBe(false)
	})

	test('getImageAssetPath should handle asset without matching path', () => {
		const path = getImageAssetPath('books', '1', '', 350, 'jpg')
		expect(path).toBe('books/1/.l.jpg')
		const path2 = getImageAssetPath('books', '1', 'invalid-asset-name', 350, 'jpg')
		expect(path2).toBe('books/1/invalid-asset-name.l.jpg')
	})

	describe('getOpenGraphPath', () => {
		test('should return the correct opengraph path', () => {
			const path = getOpenGraphPath('post', '123')
			expect(path).toBe('post/123/opengraph.png')
		})
	})

	test('getAssetPath should handle asset with matching path', () => {
		const path = getAssetPath('books', '1', '/path/to/asset.jpg')
		expect(path).toBe('books/1/asset.jpg')
	})
})
