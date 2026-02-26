import { describe, test, expect } from 'vitest'
import {
	getImageAssetPath,
	getAssetPath,
	getAssetDir,
	getOpenGraphPath,
} from './assets.js'

describe('./lib/assets.ts', () => {
	test('should return the path to the asset directory', () => {
		const path = getAssetDir('books', 'my-key')
		expect(path).toBe('books/my-key')
	})

	test('should return the path to the variant for size s', () => {
		const path = getImageAssetPath('books', 'my-key', 'image.jpg', 100, 'jpg')
		expect(path).toBe('books/my-key/image.s.jpg')
	})

	test('should return the path to the variant for size m', () => {
		const path = getImageAssetPath('books', 'my-key', 'image.jpg', 200, 'jpg')
		expect(path).toBe('books/my-key/image.m.jpg')
	})

	test('should return the path to the variant for size l', () => {
		const path = getImageAssetPath('books', 'my-key', 'image.jpg', 350, 'jpg')
		expect(path).toBe('books/my-key/image.l.jpg')
	})

	test('should return the path to the variant for size xl', () => {
		const path = getImageAssetPath('books', 'my-key', 'image.jpg', 600, 'jpg')
		expect(path).toBe('books/my-key/image.xl.jpg')
	})

	test('should return the path to the variant for size xl when width is larger than 1000', () => {
		const path = getImageAssetPath('books', 'my-key', 'image.jpg', 1200, 'jpg')
		expect(path).toBe('books/my-key/image.xl.jpg')
	})

	test('should return the path to the variant with avif format', () => {
		const path = getImageAssetPath('books', 'my-key', 'image.jpg', 350, 'avif')
		expect(path).toBe('books/my-key/image.l.avif')
	})

	test('getImageAssetPath should handle asset without matching path', () => {
		const path = getImageAssetPath('books', 'my-key', '', 350, 'jpg')
		expect(path).toBe('books/my-key/.l.jpg')
		const path2 = getImageAssetPath('books', 'my-key', 'invalid-asset-name', 350, 'jpg')
		expect(path2).toBe('books/my-key/invalid-asset-name.l.jpg')
	})

	describe('getOpenGraphPath', () => {
		test('should return the correct opengraph path', () => {
			const path = getOpenGraphPath('post', 'key123')
			expect(path).toBe('post/key123/opengraph.png')
		})
	})

	test('getAssetPath should handle asset with matching path', () => {
		const path = getAssetPath('books', 'my-key', '/path/to/asset.jpg')
		expect(path).toBe('books/my-key/asset.jpg')
	})
})
