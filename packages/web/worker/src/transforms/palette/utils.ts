/**
 * Convert RGB color space to HSL.
 * @param r Red channel (0-255)
 * @param g Green channel (0-255)
 * @param b Blue channel (0-255)
 */
export function rgbToHsl(r: number, g: number, b: number) {
	r /= 255
	g /= 255
	b /= 255
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	let h = 0
	let s = 0
	const l = (max + min) / 2

	if (max !== min) {
		const d = max - min
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0)
				break
			case g:
				h = (b - r) / d + 2
				break
			case b:
				h = (r - g) / d + 4
				break
		}
		h /= 6
	}
	return { h, s, l }
}

/**
 * Convert HSL color space back to RGB.
 * @param h Hue (0-1)
 * @param s Saturation (0-1)
 * @param l Lightness (0-1)
 */
export function hslToRgb(h: number, s: number, l: number) {
	let r, g, b
	if (s === 0) {
		r = g = b = l // achromatic
	} else {
		const hue2rgb = (p: number, q: number, t: number) => {
			if (t < 0) t += 1
			if (t > 1) t -= 1
			if (t < 1 / 6) return p + (q - p) * 6 * t
			if (t < 1 / 2) return q
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
			return p
		}
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s
		const p = 2 * l - q
		r = hue2rgb(p, q, h + 1 / 3)
		g = hue2rgb(p, q, h)
		b = hue2rgb(p, q, h - 1 / 3)
	}
	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255)
	}
}

/**
 * Convert RGB channels to a hexadecimal color string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
	const toHex = (c: number) => c.toString(16).padStart(2, '0')
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Calculate WCAG 2.0 relative luminance for an RGB color.
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
	const a = [r, g, b].map((v) => {
		v /= 255
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
	})
	return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

/**
 * Calculate contrast ratio between two relative luminances.
 */
export function getContrastRatio(l1: number, l2: number): number {
	const brightest = Math.max(l1, l2)
	const darkest = Math.min(l1, l2)
	return (brightest + 0.05) / (darkest + 0.05)
}

/**
 * Select the best readable text color (#ffffff or #000000) for a given background.
 */
export function getBestTextColor(r: number, g: number, b: number): string {
	const yiq = (r * 299 + g * 587 + b * 114) / 1000
	return yiq >= 128 ? '#000000' : '#ffffff'
}

/**
 * Refine a background color by softening saturation and bounding lightness.
 */
export function softenBackground(r: number, g: number, b: number) {
	const { h, s, l } = rgbToHsl(r, g, b)
	// Cap saturation at 35% for eye-friendly, pastel shades
	const softenedS = Math.min(s, 0.35)
	// Clamp lightness between 12% and 90% to avoid pure white/black strain
	const softenedL = Math.max(0.12, Math.min(l, 0.90))

	return hslToRgb(h, softenedS, softenedL)
}
