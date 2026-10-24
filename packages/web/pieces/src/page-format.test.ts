import { expect, test } from 'vitest'
import { formatPieceYear, formatTrackDuration } from './index.js'

test('shared year formatting uses UTC and skips absent or invalid dates', () => {
	expect(formatPieceYear('2024-12-31T23:30:00-02:00')).toBe(2025)
	expect(formatPieceYear(0)).toBe(1970)
	expect(formatPieceYear()).toBeUndefined()
	expect(formatPieceYear('invalid')).toBeUndefined()
})

test('track durations round seconds before splitting minutes and seconds', () => {
	expect(formatTrackDuration(125)).toBe('2:05')
	expect(formatTrackDuration(59.6)).toBe('1:00')
	expect(formatTrackDuration(0)).toBe('0:00')
	expect(formatTrackDuration()).toBeUndefined()
	expect(formatTrackDuration(-1)).toBeUndefined()
	expect(formatTrackDuration(Infinity)).toBeUndefined()
})
