import { expect, test } from 'vitest'
import { formatPieceDate, formatPieceByline } from './index.js'

test('shared page dates preserve the existing UTC display format', () => {
	expect(formatPieceDate(Date.UTC(2025, 0, 2))).toBe('1.2.2025')
	expect(formatPieceDate('2025-01-02T23:00:00-02:00')).toBe('1.3.2025')
	expect(formatPieceDate(0)).toBe('1.1.1970')
	expect(formatPieceDate(null)).toBeUndefined()
	expect(formatPieceDate('invalid')).toBeUndefined()
	expect(formatPieceByline(Date.UTC(2025, 0, 2), '2024-01-01', 90)).toBe('2024 · 90 min · 1.2.2025')
})
