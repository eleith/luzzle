import { describe, expect, test } from 'vitest'
import {
	getAssetDir,
	getAssetPath,
	getImageAssetPath,
	getOpenGraphPath,
	ASSET_SIZES
} from './paths.js'

describe('getAssetDir', () => {
	test('returns type/key', () => {
		expect(getAssetDir('books', 'abc123')).toBe('books/abc123')
	})
})

describe('getAssetPath', () => {
	test('returns dir/filename for a bare filename', () => {
		expect(getAssetPath('books', 'abc123', 'cover.png')).toBe('books/abc123/cover.png')
	})

	test('strips directory components from the asset path', () => {
		expect(getAssetPath('books', 'abc123', 'nested/dir/cover.png')).toBe(
			'books/abc123/cover.png'
		)
	})

	test('handles backslash-style separators', () => {
		expect(getAssetPath('books', 'abc123', 'sub\\cover.png')).toBe('books/abc123/cover.png')
	})

	test('handles assets with no extension', () => {
		expect(getAssetPath('books', 'abc123', 'README')).toBe('books/abc123/README')
	})
})

describe('ASSET_SIZES', () => {
	test('has four size categories', () => {
		expect(ASSET_SIZES).toEqual({ s: 125, m: 250, l: 500, xl: 1000 })
	})
})

describe('getImageAssetPath', () => {
	test('returns sized path for each size category', () => {
		expect(getImageAssetPath('books', 'my-key', 'image.jpg', 100, 'jpg')).toBe(
			'books/my-key/image.s.jpg'
		)
		expect(getImageAssetPath('books', 'my-key', 'image.jpg', 200, 'jpg')).toBe(
			'books/my-key/image.m.jpg'
		)
		expect(getImageAssetPath('books', 'my-key', 'image.jpg', 350, 'jpg')).toBe(
			'books/my-key/image.l.jpg'
		)
		expect(getImageAssetPath('books', 'my-key', 'image.jpg', 600, 'jpg')).toBe(
			'books/my-key/image.xl.jpg'
		)
		expect(getImageAssetPath('books', 'my-key', 'image.jpg', 1200, 'jpg')).toBe(
			'books/my-key/image.xl.jpg'
		)
	})

	test('uses the correct format extension', () => {
		const path = getImageAssetPath('books', 'my-key', 'image.jpg', 350, 'avif')
		expect(path).toBe('books/my-key/image.l.avif')
	})

	test('handles asset without matching basename pattern', () => {
		const path = getImageAssetPath('books', 'my-key', '', 350, 'jpg')
		expect(path).toBe('books/my-key/.l.jpg')

		const path2 = getImageAssetPath('books', 'my-key', 'invalid-asset-name', 350, 'jpg')
		expect(path2).toBe('books/my-key/invalid-asset-name.l.jpg')
	})

	test('strips directory components from asset path', () => {
		expect(getImageAssetPath('books', 'my-key', 'nested/deep/photo.png', 125, 'webp')).toBe(
			'books/my-key/photo.s.webp'
		)
	})
})

describe('getOpenGraphPath', () => {
	test('returns type/key/opengraph.png', () => {
		expect(getOpenGraphPath('post', 'key123')).toBe('post/key123/opengraph.png')
	})
})
