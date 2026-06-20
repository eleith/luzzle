import { describe, test, expect } from 'vitest'
import { parsePiecesDiff } from './pieces-diff.js'

const validDiff = {
	schemas: { added: ['blog'], updated: [], pruned: ['old'] },
	pieces: { added: ['a.md'], updated: ['b.md'], pruned: [] }
}

describe('parsePiecesDiff', () => {
	test('parses a well-formed PiecesDiff', () => {
		expect(parsePiecesDiff(JSON.stringify(validDiff))).toEqual(validDiff)
	})

	test('returns null for null/empty output', () => {
		expect(parsePiecesDiff(null)).toBeNull()
		expect(parsePiecesDiff('')).toBeNull()
	})

	test('returns null for malformed JSON', () => {
		expect(parsePiecesDiff('not json')).toBeNull()
	})

	test('returns null for the legacy "ok" literal', () => {
		expect(parsePiecesDiff(JSON.stringify('ok'))).toBeNull()
	})

	test('returns null when a summary is missing keys', () => {
		expect(
			parsePiecesDiff(JSON.stringify({ schemas: { added: [] }, pieces: validDiff.pieces }))
		).toBeNull()
	})

	test('returns null when an array contains non-strings', () => {
		const bad = {
			schemas: { added: [1], updated: [], pruned: [] },
			pieces: { added: [], updated: [], pruned: [] }
		}
		expect(parsePiecesDiff(JSON.stringify(bad))).toBeNull()
	})

	test('returns null when pieces is absent', () => {
		expect(parsePiecesDiff(JSON.stringify({ schemas: validDiff.schemas }))).toBeNull()
	})
})
