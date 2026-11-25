import { expect, test } from 'vitest'
import { safeExternalUrl } from './index.js'

test('external links allow normal destinations without executable URL schemes', () => {
	expect(safeExternalUrl('https://example.com')).toBe('https://example.com/')
	expect(safeExternalUrl('mailto:hello@example.com')).toBe('mailto:hello@example.com')
	expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined()
	expect(safeExternalUrl('not a URL')).toBeUndefined()
	expect(safeExternalUrl()).toBeUndefined()
})
