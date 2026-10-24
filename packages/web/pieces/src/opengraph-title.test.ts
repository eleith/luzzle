import { expect, test } from 'vitest'
import { getOpengraphTitleSize } from './index.js'

test('OG title sizing preserves the production thresholds', () => {
	expect(getOpengraphTitleSize('x'.repeat(9))).toBe(5)
	expect(getOpengraphTitleSize('x'.repeat(10))).toBe(4)
	expect(getOpengraphTitleSize('x'.repeat(20))).toBe(3.2)
	expect(getOpengraphTitleSize('x'.repeat(40))).toBe(2.5)
})
