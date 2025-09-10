import { Eta } from 'eta'
import path from 'path'
import { PieceMarkdown, PieceFrontmatter } from '@luzzle/cli'
import Sharp from 'sharp'
import { Vibrant } from 'node-vibrant/node'
import { readFile } from 'fs/promises'
import { readFileSync } from 'fs'

function bufferToBase64(buffer: Buffer, type: string, format: string) {
	const base64 = buffer.toString('base64')
	return `data:${type}/${format};base64,${base64}`
}

async function pieceToHtml(
	piece: PieceMarkdown<PieceFrontmatter>,
	options: { size: { width: number; height: number }; templates: string; luzzle: string }
): Promise<string> {
	const eta = new Eta({ views: options.templates, tags: ['[%', '%]'] })
	const htmlTemplate = await readFile(path.join(options.templates, 'html.eta'))
	eta.loadTemplate('@html', htmlTemplate.toString(), { async: true })

	const html = await eta.renderAsync('book.eta', {
		piece,
		size: options.size,
		helpers: {
			getDynamicFontSize: function getDynamicFontSize(
				title: string,
				baseSize: number,
				lineLength: number
			) {
				const decayRate = 0.85
				const minScale = 0.5
				const tier = Math.floor((title.length - 1) / lineLength)
				const calculatedScale = Math.pow(decayRate, tier)
				const finalScale = Math.max(calculatedScale, minScale)

				return Math.round(baseSize * finalScale)
			},
			fontToBase64: async function(font: string) {
				const fontPath = path.join(options.templates, font)
				const fontBuffer = readFileSync(fontPath)
				const ext = path.extname(fontPath).slice(1)
				return bufferToBase64(fontBuffer, 'font', ext)
			},
			pieceExtractImage: async function(image: string, width: number, height: number) {
				const imagePath = path.join(options.luzzle, image)
				const imageBuffer = readFileSync(imagePath)
				const jpgBuffer = await Sharp(imageBuffer)
					.clone()
					.resize({ width, height })
					.toFormat('jpg')
					.toBuffer()
				const palette = await new Vibrant(jpgBuffer).getPalette()
				return {
					base64: bufferToBase64(jpgBuffer, 'image', 'jpeg'),
					palette,
				}
			},
		},
	})

	return html
}

export default pieceToHtml
