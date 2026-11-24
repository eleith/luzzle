import { expect, test } from 'vitest'
import { getTitleSizeRem } from './index.js'

test('title size in rem decreases for longer titles', () => {
	expect(getTitleSizeRem('x'.repeat(9))).toBe(5)
	expect(getTitleSizeRem('x'.repeat(10))).toBe(4)
	expect(getTitleSizeRem('x'.repeat(20))).toBe(3.2)
	expect(getTitleSizeRem('x'.repeat(40))).toBe(2.5)
})
