import { Vibrant } from 'node-vibrant/node'
import type { PieceIconPalette } from '../pieces/helpers.js'

async function getPalette(image: string | Buffer): Promise<PieceIconPalette> {
	const palette = await new Vibrant(image, { maxDimension: 250 }).getPalette()

	return {
		background: palette.DarkVibrant?.hex,
		bodyText: palette.DarkVibrant?.bodyTextColor,
		titleText: palette.DarkVibrant?.titleTextColor,
		accent: palette.LightVibrant?.hex,
		muted: palette.Muted?.hex
	}
}

export { getPalette }
