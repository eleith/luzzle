import { describe, test, expect } from 'vitest'
import { getLang } from './lang.js'

describe('getLang', () => {
	test('resolves a known extension', () => {
		expect(getLang('foo.ts')).toBe('typescript')
	})

	test('resolves an alias (e.g. js → javascript)', () => {
		expect(getLang('foo.js')).toBe('javascript')
	})

	test('handles bare filename with no extension', () => {
		expect(getLang('javascript')).toBe('javascript')
	})

	test('falls back to the previous segment when last segment is unknown', () => {
		expect(getLang('foo.ts.bak')).toBe('typescript')
	})

	test('returns null for unknown filename and extension', () => {
		expect(getLang('foo.nonsense')).toBeNull()
	})

	test('returns null for empty filename', () => {
		expect(getLang('')).toBeNull()
	})

	test('treats .txt as text', () => {
		expect(getLang('readme.txt')).toBe('text')
	})

	test('lower-cases the filename before lookup', () => {
		expect(getLang('Main.TS')).toBe('typescript')
	})

	test('uses only the basename, not the directory', () => {
		expect(getLang('src/lib/main.ts')).toBe('typescript')
	})
})
