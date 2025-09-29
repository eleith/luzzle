import { Eta } from 'eta'
import path from 'path'
import { PieceFrontmatter, PieceMarkdown, Pieces } from '@luzzle/cli'
import Sharp from 'sharp'
import { Vibrant } from 'node-vibrant/node'
import { readFile } from 'fs/promises'

const OpenGraphImageWidth = 1200
const OpenGraphImageHeight = 630

export function bufferToBase64(buffer: Buffer, type: string, format: string) {
	const base64 = buffer.toString('base64')
	return `data:${type}/${format};base64,${base64}`
}

export const countWords = (text: string): number => {
  const withoutHtml = text.replace(/<[^>]*>/g, ' ');
  const words = withoutHtml.match(/[a-zA-Z0-9]+/g);
  return words ? words.length : 0;
}

export function getDynamicFontSize(title: string, baseSize: number, lineLength: number) {
	const decayRate = 0.85
	const minScale = 0.5
	const tier = Math.floor((title.length - 1) / lineLength)
	const calculatedScale = Math.pow(decayRate, tier)
	const finalScale = Math.max(calculatedScale, minScale)

	return Math.round(baseSize * finalScale)
}

export function getHashIndexFor(word: string, max: number): number {
	let hash = 0
	for (let i = 0; i < word.length; i++) {
		const char = word.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash // Convert to 32bit integer
	}
	return Math.abs(hash) % max
}

export async function fontToBase64(fontPath: string) {
	const fontBuffer = await readFile(fontPath)
	const ext = path.extname(fontPath).slice(1)
	return bufferToBase64(fontBuffer, 'font', ext)
}

export async function extractImage(image: Buffer, options?: { width?: number; height?: number, format: 'jpeg' | 'png' }) {
	const width = options?.width
	const height = options?.height
	const sharpFormat: 'jpeg' | 'png' = options?.format || 'jpeg'
	const sharpResize = width || height ? { width, height } : undefined
	const jpgBuffer = await Sharp(image).clone().resize(sharpResize).toFormat(sharpFormat).toBuffer()
	const palette = await new Vibrant(jpgBuffer).getPalette()
	return {
		base64: bufferToBase64(jpgBuffer, 'image', sharpFormat),
		palette,
	}
}

async function generateHtml(
	markdown: PieceMarkdown<PieceFrontmatter>,
	pieces: Pieces,
	template: string
): Promise<string> {
	const internalTemplateDir = path.join(import.meta.dirname, './templates')
	const htmlTemplate = await readFile(path.join(internalTemplateDir, 'html.eta'))
	const pieceTemplateBuffer = await readFile(template)
	const size = { width: OpenGraphImageWidth, height: OpenGraphImageHeight }
	const templateDir = path.dirname(template)
	const helpers = {
		countWords,
		extractImage: async (image: string, resize?: { width: number; height: number, format: 'jpeg' | 'png' }) => {
			const buffer = await readFile(path.join(templateDir, image))
			return extractImage(buffer, resize)
		},
		fontToBase64: async (font: string) => {
			const templatePath = path.join(templateDir, font)
			return fontToBase64(templatePath)
		},
		getDynamicFontSize,
		getHashIndexFor,
		pieceExtractImage: async (image: string, resize?: { width: number; height: number, format: 'jpeg' | 'png' }) => {
			const buffer = await pieces.getPieceAsset(image)
			return extractImage(buffer, resize)
		},
	}

	const eta = new Eta({ views: templateDir, tags: ['[%', '%]'] })

	eta.loadTemplate('@html', htmlTemplate.toString(), { async: true })

	return await eta.renderStringAsync(pieceTemplateBuffer.toString(), { markdown, size, helpers })
}

export { generateHtml }
