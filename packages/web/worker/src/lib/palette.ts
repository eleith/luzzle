import { Vibrant } from 'node-vibrant/node'

export interface Palette {
	background?: string
	bodyText?: string
	titleText?: string
	accent?: string
	muted?: string
}

export async function getPalette(image: Buffer): Promise<Palette> {
	const palette = await new Vibrant(image, { maxDimension: 250 }).getPalette()

	return {
		background: palette.DarkVibrant?.hex,
		bodyText: palette.DarkVibrant?.bodyTextColor,
		titleText: palette.DarkVibrant?.titleTextColor,
		accent: palette.LightVibrant?.hex,
		muted: palette.Muted?.hex,
	}
}
