import { describe, test, expect } from 'vitest'
import sharp from 'sharp'
import { getPalette } from './colorlip.js'

describe('transforms/palette/colorlip', () => {
	test('extracts palette from image buffer using colorlip', async () => {
		// Create a simple 10x10 image buffer dynamically using sharp
		// Fill it with red background and a small blue area for accent
		const image = await sharp({
			create: {
				width: 10,
				height: 10,
				channels: 3,
				background: { r: 255, g: 0, b: 0 },
			},
		})
			.composite([
				{
					input: Buffer.from([0, 0, 255]), // blue pixel
					raw: { width: 1, height: 1, channels: 3 },
					top: 0,
					left: 0,
				},
			])
			.png()
			.toBuffer()

		const palette = await getPalette(image)

		// Assert on legacy shape properties
		expect(palette.background).toBeDefined()
		expect(palette.background).toMatch(/^#[0-9a-fA-F]{6}$/)
		expect(palette.accent).toBeDefined()
		expect(palette.accent).toMatch(/^#[0-9a-fA-F]{6}$/)
		expect(palette.muted).toBeDefined()
		expect(palette.muted).toMatch(/^#[0-9a-fA-F]{6}$/)

		// Contrast text recommendations should be present and valid
		expect(palette.bodyText).toBeDefined()
		expect(['#ffffff', '#000000']).toContain(palette.bodyText)
		expect(palette.titleText).toBeDefined()
		expect(['#ffffff', '#000000']).toContain(palette.titleText)

		// Extended properties
		expect(palette.dominant).toBeDefined()
		expect(palette.swatches).toBeInstanceOf(Array)
		expect(palette.swatches?.length).toBeGreaterThan(0)
	})
})
