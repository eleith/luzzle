import { describe, test, expect } from 'vitest'
import {
	rgbToHsl,
	hslToRgb,
	rgbToHex,
	getRelativeLuminance,
	getContrastRatio,
	getBestTextColor,
	softenBackground
} from './utils.js'

describe('transforms/palette/utils', () => {
	test('rgbToHsl and hslToRgb color space conversions', () => {
		// Pure Red
		const hslRed = rgbToHsl(255, 0, 0)
		expect(hslRed.h).toBeCloseTo(0, 5)
		expect(hslRed.s).toBeCloseTo(1, 5)
		expect(hslRed.l).toBeCloseTo(0.5, 5)

		const rgbRed = hslToRgb(hslRed.h, hslRed.s, hslRed.l)
		expect(rgbRed.r).toBe(255)
		expect(rgbRed.g).toBe(0)
		expect(rgbRed.b).toBe(0)

		// White
		const hslWhite = rgbToHsl(255, 255, 255)
		expect(hslWhite.l).toBeCloseTo(1.0, 5)

		const rgbWhite = hslToRgb(hslWhite.h, hslWhite.s, hslWhite.l)
		expect(rgbWhite.r).toBe(255)
		expect(rgbWhite.g).toBe(255)
		expect(rgbWhite.b).toBe(255)
	})

	test('rgbToHex conversion', () => {
		expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
		expect(rgbToHex(0, 255, 0)).toBe('#00ff00')
		expect(rgbToHex(0, 0, 255)).toBe('#0000ff')
		expect(rgbToHex(255, 255, 255)).toBe('#ffffff')
	})

	test('getRelativeLuminance', () => {
		expect(getRelativeLuminance(0, 0, 0)).toBe(0.0)
		expect(getRelativeLuminance(255, 255, 255)).toBe(1.0)
	})

	test('getContrastRatio', () => {
		expect(getContrastRatio(1.0, 0.0)).toBe(21) // White vs Black
		expect(getContrastRatio(1.0, 1.0)).toBe(1.0) // Same color
	})

	test('getBestTextColor chooses highest contrast color', () => {
		// Dark background should choose white text
		expect(getBestTextColor(20, 20, 20)).toBe('#ffffff')

		// Light background should choose black text
		expect(getBestTextColor(240, 240, 240)).toBe('#000000')

		// Borderline dark/colored backgrounds that previously got black text should now get white text
		expect(getBestTextColor(63, 132, 63)).toBe('#ffffff') // #3f843f (dark green)
		expect(getBestTextColor(73, 126, 152)).toBe('#ffffff') // #497e98 (medium slate blue)
	})

	test('softenBackground caps saturation and clamps lightness', () => {
		// Pure bright red (100% Saturation, 50% Lightness)
		const softenedRed = softenBackground(255, 0, 0)
		const hslSoftened = rgbToHsl(softenedRed.r, softenedRed.g, softenedRed.b)

		// Saturation should be capped at 35%
		expect(hslSoftened.s).toBeCloseTo(0.35, 1)

		// Lightness of blinding white (100%) should be capped at 90%
		const softenedWhite = softenBackground(255, 255, 255)
		const hslSoftenedWhite = rgbToHsl(softenedWhite.r, softenedWhite.g, softenedWhite.b)
		expect(hslSoftenedWhite.l).toBeLessThanOrEqual(0.91)

		// Lightness of pitch black (0%) should be clamped to at least 12%
		const softenedBlack = softenBackground(0, 0, 0)
		const hslSoftenedBlack = rgbToHsl(softenedBlack.r, softenedBlack.g, softenedBlack.b)
		expect(hslSoftenedBlack.l).toBeGreaterThanOrEqual(0.11)
	})
})
