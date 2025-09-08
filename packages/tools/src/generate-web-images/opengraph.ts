import path from 'path'
import { getLastRunFor, setLastRunFor } from './utils/lastRun.js'
import { mkdir, readFile, stat, writeFile } from 'fs/promises'
import { type WebPieces, type Font } from './utils/types.js'
import satori, { type SatoriOptions } from 'satori'
import { Resvg } from '@resvg/resvg-js'
import toReactElement from './utils/toReactElement.js'
import { imageToBase64 } from './utils/imageToBase64.js'
import pieceToHtml from './utils/html.js'

const OpenGraphImageWidth = 1200
const OpenGraphImageHeight = 600 // should be 630

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
async function generateOpenGraphForPiece(piece: WebPieces, fonts: Array<Font>, lastRun: Date, outputDir: string) {
	let mediaBuffer: Buffer | undefined = undefined

	const pieceModifiedTime = new Date(piece.date_updated || piece.date_added)
	const ogDir = `${outputDir}/${piece.type}/${piece.slug}`

	if (piece.media) {
		const mediaFileBaseName = path.basename(piece.media, path.extname(piece.media))
		const mediaPath = `${outputDir}/${piece.type}/${piece.slug}/${mediaFileBaseName}.large.jpg`
		const mediaStat = await stat(mediaPath).catch(() => null)

		if (mediaStat?.isFile()) {
			mediaBuffer = await readFile(mediaPath)
		}
	}

	if (pieceModifiedTime < lastRun) {
		return
	}

	const html = await pieceToHtml(piece, mediaBuffer)

	try {
		const svg = await reactElementToSvg(html, fonts)
		const png = svgToPng(svg)

		console.log(`generating opengraph for ${piece.type}/${piece.slug}`)
		await mkdir(ogDir, { recursive: true })
		await writeFile(`${ogDir}/opengraph.png`, png)
	} catch (e) {
		console.error(e)
	}
}

export async function generateOpenGraphsForPieces(pieces: WebPieces[], font: string, outputDir: string, force: boolean = false) {
	const operation = 'generate-open-graph'
	const lastRun = force ? new Date(0) : await getLastRunFor(outputDir, operation)
	const fontBuffer = await readFile(font)
	const fonts: Font[] = [
		{
			name: 'Noto Sans',
			weight: 400,
			style: 'normal',
			data: fontBuffer
		}
	]

	for (const piece of pieces) {
		await generateOpenGraphForPiece(piece, fonts, lastRun, outputDir)
	}

	if (!force) {
		await setLastRunFor(outputDir, operation, new Date())
	}
}
