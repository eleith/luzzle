import { expect, test } from 'vitest'
import { interpolate } from './index.js'

test('interpolates geometry with endpoint clamping and two-decimal precision', () => {
	const input = { min: 0, max: 3 }
	const output = { min: 0, max: 1 }
	expect(interpolate(-1, input, output)).toBe(0)
	expect(interpolate(4, input, output)).toBe(1)
	expect(interpolate(1, input, output)).toBe(0.33)
	expect(interpolate(3, input, output)).toBe(1)
})
