import type { Swatch } from './extract.js'
import { colorfulness, getBestTextColor, rgbToHex, softenBackground } from './utils.js'

export interface Palette {
	background?: string
	bodyText?: string
	titleText?: string
	accent?: string
	muted?: string
	dominant?: string
	swatches: string[]
}

const MIN_BACKGROUND_COLORFULNESS = 0.1

export function createPalette(swatches: readonly Swatch[]): Palette {
	const colors = [...swatches].sort((a, b) => b.population - a.population)
	const dominant = colors[0]
	if (!dominant) return { swatches: [] }

	const selected =
		colors.find((color) => colorfulness(color) >= MIN_BACKGROUND_COLORFULNESS) ?? dominant
	const accent =
		colors
			.filter((color) => color !== selected)
			.sort((a, b) => colorfulness(b) - colorfulness(a))[0] ?? selected
	const muted = [...colors].sort((a, b) => colorfulness(a) - colorfulness(b))[0]
	const background = softenBackground(selected.r, selected.g, selected.b)
	const text = getBestTextColor(background.r, background.g, background.b)

	return {
		background: rgbToHex(background.r, background.g, background.b),
		bodyText: text,
		titleText: text,
		accent: accent.hex,
		muted: muted.hex,
		dominant: dominant.hex,
		swatches: colors.map((color) => color.hex),
	}
}
