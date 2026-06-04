import { getPalette as getRawPalette } from 'colorlip/sharp'

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

	// Determine background color (choose a prominent swatch that isn't dominant or accent to prevent image bleeding)
	const nonPrimarySwatches = swatches.filter(
		(s) => s.hex !== dominant?.hex && s.hex !== accent?.hex
	)
	const bg = nonPrimarySwatches[0] || swatches.find((s) => s.hex !== dominant?.hex) || dominant
	const backgroundColor = bg?.hex

	// Compute accessible text colors using node-vibrant's YIQ formula
	let bodyText: string | undefined
	let titleText: string | undefined
	if (bg) {
		const yiq = (bg.r * 299 + bg.g * 587 + bg.b * 114) / 1000
		bodyText = yiq < 150 ? '#ffffff' : '#000000'
		titleText = yiq < 200 ? '#ffffff' : '#000000'
	}

	// Determine muted color by finding the swatch with the lowest saturation
	// that isn't the dominant or accent color
	const candidates = nonPrimarySwatches.length > 0 ? nonPrimarySwatches : swatches
	const mutedSwatch = candidates.slice().sort((a, b) => a.saturation - b.saturation)[0]

	return {
		background: backgroundColor,
		bodyText,
		titleText,
		accent: accent?.hex || swatches[1]?.hex,
		muted: mutedSwatch?.hex,
		dominant: dominant?.hex,
		swatches: swatches.map((s) => s.hex),
	}
}

