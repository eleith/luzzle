import { expect, test } from 'vitest'
import { getRelativeLuminance, getContrastRatio, getBestTextColor } from './utils.js'

test.each([
	{ rgb: [20, 20, 20], text: '#ffffff' },
	{ rgb: [240, 240, 240], text: '#000000' },
	{ rgb: [119, 119, 119], text: '#000000' },
])('chooses higher-contrast text for $rgb', ({ rgb: [r, g, b], text }) => {
	const selected = getBestTextColor(r, g, b)

	expect(selected).toBe(text)
	expect(
		getContrastRatio(getRelativeLuminance(r, g, b), selected === '#ffffff' ? 1 : 0)
	).toBeGreaterThanOrEqual(4.5)
})
