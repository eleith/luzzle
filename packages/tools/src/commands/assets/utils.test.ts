import { describe, test, expect } from 'vitest'
import { getAssetPath, isImage, getAssetDir } from './utils.js'

describe('src/commands/assets/utils', () => {
	test('should return the path to the asset directory', () => {
		const path = getAssetDir('books', '1')
		expect(path).toBe('books/1')
	})

	test('should return the path to the original asset if no format is specified', () => {
		const path = getAssetPath('books', '1', 'image.jpg')
		expect(path).toBe('books/1/image.jpg')
	})

	test('should return the path to the variant', () => {
		const path = getAssetPath('books', '1', 'image.jpg', { format: 'avif', size: 's' })
				expect(path).toBe('books/1/image.s.avif')
			})
		
			test('should return the path to the original asset if the asset is not an image', () => {
				const path = getAssetPath('books', '1', 'document.pdf', { format: 'avif', size: 's' })
				expect(path).toBe('books/1/document.pdf')
			})
		
			test('should return the path to the original asset has no extension', () => {
				const path = getAssetPath('books', '1', 'document', { format: 'avif', size: 's' })
				expect(path).toBe('books/1/document')
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
		
			test('should handle assets with paths', () => {
				const path = getAssetPath('books', '1', '/path/to/image.jpg', { format: 'avif', size: 's' })
				expect(path).toBe('books/1/image.s.avif')
		
				const path2 = getAssetPath('books', '1', '/path/to/document.pdf')
				expect(path2).toBe('books/1/document.pdf')
			})
	test('should handle empty asset string', () => {
		const path = getAssetPath('books', '1', '')
		expect(path).toBe('books/1/')
		expect(isImage('')).toBe(false)
	})
})
