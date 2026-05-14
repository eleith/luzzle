import { describe, expect, test } from 'vitest'
import { getAssetDir, getAssetPath } from './paths.js'

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
