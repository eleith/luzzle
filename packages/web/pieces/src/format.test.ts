import { expect, test } from 'vitest'
import { formatPieceByline, safeExternalUrl } from './index.js'

test('poster bylines preserve UTC date/year formatting and duration', () => {
	expect(formatPieceByline(Date.UTC(2025, 0, 2), '2024-03-01', 90)).toBe('2024 · 90 min · 1.2.2025')
	expect(formatPieceByline(undefined, Date.UTC(2024, 0, 1), 0)).toBe('2024 · 0 min')
	expect(formatPieceByline(undefined, 'invalid')).toBe('')
	expect(formatPieceByline(NaN)).toBe('')
})

test('external links allow normal destinations without executable URL schemes', () => {
	expect(safeExternalUrl('https://example.com')).toBe('https://example.com/')
	expect(safeExternalUrl('mailto:hello@example.com')).toBe('mailto:hello@example.com')
	expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined()
	expect(safeExternalUrl('not a URL')).toBeUndefined()
	expect(safeExternalUrl()).toBeUndefined()
})
