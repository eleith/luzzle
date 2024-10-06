import { reactElementToSvg, svgToPng, type Font } from '../../src/lib/openGraph/image'
import pieceToHtml from '../../src/lib/pieces/openGraph/html'
import path from 'path'
import { type WebPieces } from '../../src/lib/pieces/types'
import { getLastRunFor, setLastRunFor } from './lastRun'
import { mkdir, readFile, stat, writeFile } from 'fs/promises'
//import { PRIVATE_LUZZLE_IMAGES_DIR } from '$env/static/private'
import dotenv from 'dotenv'

dotenv.config({ path: '../../.env.local' })
const PRIVATE_LUZZLE_IMAGES_DIR = process.env.PRIVATE_LUZZLE_IMAGES_DIR as string

async function generateOpenGraphForPiece(piece: WebPieces, fonts: Array<Font>, lastRun: Date) {
	let mediaBuffer: Buffer | undefined = undefined

	const pieceModifiedTime = new Date(piece.date_updated || piece.date_added)
	const ogDir = `${PRIVATE_LUZZLE_IMAGES_DIR}/${piece.type}/${piece.slug}`

	if (piece.media) {
		const mediaFileBaseName = path.basename(piece.media, path.extname(piece.media))
		const mediaPath = `${PRIVATE_LUZZLE_IMAGES_DIR}/${piece.type}/${piece.slug}/${mediaFileBaseName}.large.jpg`
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

export async function generateOpenGraphsForPieces(pieces: WebPieces[]) {
	const operation = 'generate-open-graph'
	const lastRun = await getLastRunFor(PRIVATE_LUZZLE_IMAGES_DIR, operation)
	const fontBuffer = await readFile('./static/fonts/noto-sans.ttf')
	const fonts = [
		{
			name: 'Noto Sans',
			weight: 400,
			style: 'normal',
			data: fontBuffer
		}
	]

	for (const piece of pieces) {
		await generateOpenGraphForPiece(piece, fonts, lastRun)
	}

	await setLastRunFor(PRIVATE_LUZZLE_IMAGES_DIR, operation, new Date())
}
