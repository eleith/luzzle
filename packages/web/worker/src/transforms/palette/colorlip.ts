import { getPalette as getRawPalette } from 'colorlip/sharp'
import { softenBackground, getBestTextColor, rgbToHex } from './utils.js'

export interface Palette {
	background?: string
	bodyText?: string
	titleText?: string
	accent?: string
	muted?: string
	dominant?: string
	swatches?: string[]
}

export async function getPalette(image: Buffer): Promise<Palette> {
	const rawPalette = await getRawPalette(image)
	const dominant = rawPalette.dominant
	const accent = rawPalette.accent
	const swatches = rawPalette.swatches || []

	// Determine raw background color (choose a prominent swatch that isn't dominant or accent to prevent image bleeding)
	const nonPrimarySwatches = swatches.filter(
		(s) => s.hex !== dominant?.hex && s.hex !== accent?.hex
	)
	const bg = nonPrimarySwatches[0] || swatches.find((s) => s.hex !== dominant?.hex) || dominant

	let background: string | undefined
	let bodyText: string | undefined
	let titleText: string | undefined

	if (bg) {
		// Soften background saturation/lightness to avoid eyes strain
		const softenedBg = softenBackground(bg.r, bg.g, bg.b)
		background = rgbToHex(softenedBg.r, softenedBg.g, softenedBg.b)

		// Determine mathematically optimal text contrast
		const textColor = getBestTextColor(softenedBg.r, softenedBg.g, softenedBg.b)
		bodyText = textColor
		titleText = textColor
	}

	// Determine muted color by finding the swatch with the lowest saturation
	// that isn't the dominant or accent color
	const candidates = nonPrimarySwatches.length > 0 ? nonPrimarySwatches : swatches
	const mutedSwatch = candidates.slice().sort((a, b) => a.saturation - b.saturation)[0]

	return {
		background,
		bodyText,
		titleText,
		accent: accent?.hex || swatches[1]?.hex,
		muted: mutedSwatch?.hex,
		dominant: dominant?.hex,
		swatches: swatches.map((s) => s.hex),
	}
}
