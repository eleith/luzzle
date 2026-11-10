import sharp from 'sharp'
import { rgbToHex, type Rgb } from './utils.js'

export interface Swatch extends Rgb {
	hex: string
	population: number
}

export async function extractSwatches(image: Buffer): Promise<Swatch[]> {
	const quantized = await sharp(image)
		.resize({ width: 150, height: 150, fit: 'inside', withoutEnlargement: true })
		.png({ palette: true, colours: 16, dither: 0 })
		.toBuffer()
	const { data } = await sharp(quantized)
		.toColourspace('srgb')
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true })

	const swatches = new Map<number, Swatch>()
	for (let offset = 0; offset < data.length; offset += 4) {
		const r = data[offset]
		const g = data[offset + 1]
		const b = data[offset + 2]
		const alpha = data[offset + 3] / 255
		if (alpha === 0) continue

		const key = (r << 16) | (g << 8) | b
		const swatch = swatches.get(key)
		if (swatch) swatch.population += alpha
		else swatches.set(key, { r, g, b, hex: rgbToHex(r, g, b), population: alpha })
	}
	return [...swatches.values()]
}
