import { describe, test, expect } from 'vitest'
import { generateAssetKey } from './assets.key.js'

describe('generateAssetKey', () => {
	test('should generate a deterministic key', () => {
		const key1 = generateAssetKey('path/to/file.md', 'salt')
		const key2 = generateAssetKey('path/to/file.md', 'salt')
		expect(key1).toBe(key2)
		expect(key1).toHaveLength(64) // sha256 hex length
	})

	test('should generate different keys for different salts', () => {
		const key1 = generateAssetKey('path/to/file.md', 'salt1')
		const key2 = generateAssetKey('path/to/file.md', 'salt2')
		expect(key1).not.toBe(key2)
	})

	test('should normalize backslashes', () => {
		const key1 = generateAssetKey('path/to/file.md', 'salt')
		const key2 = generateAssetKey('path\\to\\file.md', 'salt')
		expect(key1).toBe(key2)
	})

	test('should handle missing salt', () => {
		const key = generateAssetKey('path/to/file.md')
		expect(key).toHaveLength(64)
	})
})
