import { expect, test } from 'vitest'
import sharp from 'sharp'
import { extractSwatches } from './extract.js'
import { createPalette } from './palette.js'
import { getContrastRatio, getRelativeLuminance, rgbToHsl } from './utils.js'

test('builds a colorful, readable palette from a cover with prominent neutral tones', async () => {
	const image = await sharp(
		Buffer.from(`
		<svg xmlns="http://www.w3.org/2000/svg" width="120" height="150">
			<rect width="120" height="150" fill="#DCD6CC" />
			<rect width="120" height="25" y="60" fill="#22211E" />
			<rect width="120" height="20" y="85" fill="#78746E" />
			<rect width="120" height="15" y="105" fill="#ABAAA6" />
			<rect width="120" height="10" y="120" fill="#B8594C" />
			<rect width="120" height="20" y="130" fill="#648298" />
		</svg>
	`)
	)
		.png()
		.toBuffer()

	const swatches = await extractSwatches(image)
	const palette = createPalette(swatches)

	const blue = swatches.find((color) => color.b > color.r + 20)!
	const red = swatches.find((color) => color.r > color.b + 30)!
	expect(blue.population).toBeGreaterThan(red.population)
	expect(palette.background).toBe(blue.hex)
	const [r, g, b] = palette.background!.match(/[0-9a-f]{2}/gi)!.map((c) => parseInt(c, 16))
	expect(rgbToHsl(r, g, b).s).toBeGreaterThan(0.15)
	expect(['#000000', '#ffffff']).toContain(palette.bodyText)
	const textLuminance = palette.bodyText === '#ffffff' ? 1 : 0
	expect(getContrastRatio(getRelativeLuminance(r, g, b), textLuminance)).toBeGreaterThanOrEqual(4.5)
})

test('does not include invisible pixels in the extracted swatches', async () => {
	const white = [255, 255, 255, 255]
	const transparent = [0, 0, 0, 0]
	const image = await sharp(
		Buffer.from([...white, ...transparent, ...transparent, ...transparent]),
		{
			raw: { width: 2, height: 2, channels: 4 },
		}
	)
		.png()
		.toBuffer()

	const swatches = await extractSwatches(image)

	expect(swatches.map((color) => color.hex)).toEqual(['#ffffff'])
})
