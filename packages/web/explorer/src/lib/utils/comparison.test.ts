import { describe, expect, test } from 'vitest'
import { normalize, isFieldEqual } from './comparison.js'

describe('normalize', () => {
	test('returns empty string for null', () => {
		expect(normalize(null)).toBe('')
	})

	test('returns empty string for undefined', () => {
		expect(normalize(undefined)).toBe('')
	})

	test('replaces CRLF with LF in strings', () => {
		expect(normalize('a\r\nb\r\nc')).toBe('a\nb\nc')
	})

	test('leaves non-string non-nullish values unchanged', () => {
		expect(normalize(42)).toBe(42)
		expect(normalize(true)).toBe(true)
		const obj = { a: 1 }
		expect(normalize(obj)).toBe(obj)
	})
})

describe('isFieldEqual', () => {
	test('treats null and undefined as equal (both normalize to empty string)', () => {
		expect(isFieldEqual(null, undefined)).toBe(true)
	})

	test('treats CRLF and LF strings as equal', () => {
		expect(isFieldEqual('line1\r\nline2', 'line1\nline2')).toBe(true)
	})

	test('returns false for different primitive types', () => {
		expect(isFieldEqual('1', 1)).toBe(false)
	})

	test('deeply compares arrays', () => {
		expect(isFieldEqual([1, 2, 3], [1, 2, 3])).toBe(true)
		expect(isFieldEqual([1, 2, 3], [1, 2, 4])).toBe(false)
		expect(isFieldEqual([1, 2], [1, 2, 3])).toBe(false)
	})

	test('returns false when comparing array to non-array object', () => {
		expect(isFieldEqual([1, 2], { 0: 1, 1: 2 })).toBe(false)
	})

	test('deeply compares plain objects', () => {
		expect(isFieldEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBe(true)
		expect(isFieldEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } })).toBe(false)
	})

	test('returns false when object key sets differ', () => {
		expect(isFieldEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
		expect(isFieldEqual({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false)
	})

	test('normalizes string fields nested in objects', () => {
		expect(isFieldEqual({ note: 'a\r\nb' }, { note: 'a\nb' })).toBe(true)
	})

	test('handles primitive equality', () => {
		expect(isFieldEqual(1, 1)).toBe(true)
		expect(isFieldEqual('foo', 'foo')).toBe(true)
	})
})
