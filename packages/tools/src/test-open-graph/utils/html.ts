import { readFileSync, statSync } from 'fs'
import { Eta } from 'eta'
import path from 'path'
import { PieceMarkdown, PieceFrontmatter } from '@luzzle/cli'
import Sharp from 'sharp'
import { Vibrant } from 'node-vibrant/node'
import { readFile } from 'fs/promises'

async function convertToJpeg(image: Buffer, width: number, height: number) {
	return Sharp(image).clone().resize({ width, height }).toFormat('jpg').toBuffer()
}

async function mediaToJpeg(mediaPath: string, width: number, height: number) {
	const mediaStat = statSync(mediaPath)

	if (mediaStat?.isFile()) {
		const mediaBuffer = readFileSync(mediaPath)
		return await convertToJpeg(mediaBuffer, width, height)
	} else {
		throw new Error(`Media file not found at path: ${mediaPath}`)
	}
}

function imageToBase64(image: Buffer, format: 'jpeg' | 'jpg' | 'png' = 'jpeg') {
	const base64 = image.toString('base64')
	return `data:image/${format};base64,${base64}`
}

function fontToBase64(fontPath: string) {
	const fontBuffer = readFileSync(fontPath)
	const base64 = fontBuffer.toString('base64')
	const ext = path.extname(fontPath).slice(1)
	return `data:font/${ext};base64,${base64}`
}

async function pieceToHtml(
	piece: PieceMarkdown<PieceFrontmatter>,
	options: { size: { width: number; height: number }; templates: string; luzzle: string }
): Promise<string> {
	const eta = new Eta({ views: options.templates })
	const htmlTemplate = await readFile(path.join(options.templates, 'html.eta'))
	eta.loadTemplate('@html', htmlTemplate.toString(), { async: true })

	const html = await eta.renderAsync('book.eta', {
		piece,
		size: options.size,
		helpers: {
			imageToBase64: imageToBase64,
			mediaToJpeg: async function(mediaPath: string, width: number, height: number) {
				return mediaToJpeg(path.join(options.luzzle, mediaPath), width, height)
			},
			extractPaletteFromImage: async function(image: Buffer) {
				return new Vibrant(image).getPalette()
			},
			fontToBase64: function(fontPath: string) {
				return fontToBase64(path.join(options.templates, fontPath))
			}
		},
	})

	return html
}

export default pieceToHtml
