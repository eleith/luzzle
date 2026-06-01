import { describe, expect, test } from 'vitest'
import { createHash } from 'node:crypto'
import { generateAssetKey } from './assets.key.server.js'

function expectedHash(input: string): string {
	return createHash('sha256').update(input).digest('hex')
}

describe('generateAssetKey', () => {
	test('returns a 64-char hex sha256 digest', () => {
		const key = generateAssetKey('/path/to/file.png', 'salt')
		expect(key).toMatch(/^[a-f0-9]{64}$/)
	})

	test('is deterministic for the same inputs', () => {
		const a = generateAssetKey('/path/to/file.png', 'salt')
		const b = generateAssetKey('/path/to/file.png', 'salt')
		expect(a).toBe(b)
	})

	test('different salts produce different keys', () => {
		const a = generateAssetKey('/path/to/file.png', 'salt-a')
		const b = generateAssetKey('/path/to/file.png', 'salt-b')
		expect(a).not.toBe(b)
	})

	test('different paths produce different keys', () => {
		const a = generateAssetKey('/path/to/file-a.png', 'salt')
		const b = generateAssetKey('/path/to/file-b.png', 'salt')
		expect(a).not.toBe(b)
	})

	test('normalizes Windows backslashes to forward slashes before hashing', () => {
		const windows = generateAssetKey('C:\\images\\file.png', 'salt')
		const posix = generateAssetKey('C:/images/file.png', 'salt')
		expect(windows).toBe(posix)
	})

	test('treats undefined salt as empty string', () => {
		const noSalt = generateAssetKey('/path/to/file.png')
		const emptySalt = generateAssetKey('/path/to/file.png', '')
		expect(noSalt).toBe(emptySalt)
		expect(noSalt).toBe(expectedHash('/path/to/file.png'))
	})

	test('appends salt to normalized path before hashing', () => {
		expect(generateAssetKey('/a/b.png', 'pepper')).toBe(expectedHash('/a/b.pngpepper'))
	})
})
