import { expect, test } from 'vitest'
import type { Swatch } from './extract.js'
import { createPalette } from './palette.js'

function swatch(hex: string, population: number): Swatch {
	const [r, g, b] = hex.match(/[0-9a-f]{2}/gi)!.map((channel) => parseInt(channel, 16))
	return { r, g, b, hex, population }
}

test('uses the most prominent colorful swatch for the background and image colors for other roles', () => {
	const cream = swatch('#dcd6cc', 600)
	const blue = swatch('#648298', 250)
	const red = swatch('#b8594c', 150)

	const palette = createPalette([red, cream, blue])

	expect(palette.background).toBe(blue.hex)
	expect(palette.accent).toBe(red.hex)
	expect(palette.muted).toBe(cream.hex)
	expect(palette.dominant).toBe(cream.hex)
})

test('uses the dominant tone when the image is monochrome', () => {
	const gray = swatch('#787878', 7)

	const palette = createPalette([swatch('#282828', 2), gray])

	expect(palette.background).toBe(gray.hex)
})

test('chooses accessible text against the softened background rather than the source swatch', () => {
	const palette = createPalette([swatch('#009b00', 1)])

	expect(palette.background).toBe('#1b801b')
	expect(palette.bodyText).toBe('#ffffff')
	expect(palette.titleText).toBe(palette.bodyText)
})

test('leaves presentation colors unset when no swatches are available', () => {
	expect(createPalette([])).toEqual({ swatches: [] })
})
