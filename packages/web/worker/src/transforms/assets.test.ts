import { describe, test, expect, vi } from 'vitest'
import { buildAssetMaps } from './assets.js'

vi.mock('../assets/key.js', () => ({
	generateAssetKey: vi.fn((path: string) => `key-for-${path}`),
}))

describe('transforms/assets', () => {
	test('builds both maps from assets JSON array', () => {
		const json = JSON.stringify(['img/photo.jpg', 'docs/readme.md'])
		const { pathToKey, keyToPath } = buildAssetMaps(json, 'salt')

		expect(pathToKey.get('img/photo.jpg')).toBe('key-for-img/photo.jpg')
		expect(pathToKey.get('docs/readme.md')).toBe('key-for-docs/readme.md')
		expect(keyToPath.get('key-for-img/photo.jpg')).toBe('img/photo.jpg')
		expect(keyToPath.get('key-for-docs/readme.md')).toBe('docs/readme.md')
	})

	test('returns empty maps for undefined input', () => {
		const { pathToKey, keyToPath } = buildAssetMaps(undefined, 'salt')

		expect(pathToKey.size).toBe(0)
		expect(keyToPath.size).toBe(0)
	})

	test('returns empty maps for empty array', () => {
		const { pathToKey, keyToPath } = buildAssetMaps('[]', 'salt')

		expect(pathToKey.size).toBe(0)
		expect(keyToPath.size).toBe(0)
	})
})
