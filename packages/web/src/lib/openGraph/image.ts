import satori, { type SatoriOptions } from 'satori'
import { Resvg } from '@resvg/resvg-js'
import toReactElement from './toReactElement'

export type Font = {
	name: string
	weight?: number
	style: string
	data: ArrayBuffer
}

const OpenGraphImageWidth = 1200
const OpenGraphImageHeight = 600

async function imageToBase64(media: Buffer) {
	const base64 = media.toString('base64')
	return `data:image/jpeg;base64,${base64}`
}

async function reactElementToSvg(html: string, fonts: Array<Font>) {
	const reactElementObject = toReactElement(html)

	return satori(reactElementObject, {
		width: OpenGraphImageWidth,
		height: OpenGraphImageHeight,
		fonts: fonts as SatoriOptions['fonts']
	})
}

function svgToPng(svg: string) {
	return new Resvg(svg).render().asPng()
}

export { imageToBase64, reactElementToSvg, svgToPng }
