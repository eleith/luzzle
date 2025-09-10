import { Eta } from 'eta'
import path from 'path'
import { PieceFrontmatter, PieceMarkdown } from '@luzzle/cli'
import Sharp from 'sharp'
import { Vibrant } from 'node-vibrant/node'
import { readFile } from 'fs/promises'

const OpenGraphImageWidth = 1200
const OpenGraphImageHeight = 630

function bufferToBase64(buffer: Buffer, type: string, format: string) {
	const base64 = buffer.toString('base64')
	return `data:${type}/${format};base64,${base64}`
}

function getDynamicFontSize(title: string, baseSize: number, lineLength: number) {
	const decayRate = 0.85
	const minScale = 0.5
	const tier = Math.floor((title.length - 1) / lineLength)
	const calculatedScale = Math.pow(decayRate, tier)
	const finalScale = Math.max(calculatedScale, minScale)

	return Math.round(baseSize * finalScale)
}

async function fontToBase64(fontPath: string) {
	const fontBuffer = await readFile(fontPath)
	const ext = path.extname(fontPath).slice(1)
	return bufferToBase64(fontBuffer, 'font', ext)
}

async function extractImage(imagePath: string, width: number, height: number) {
	const imageBuffer = await readFile(imagePath)
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
}

async function generateHtml(
	pieceMarkdown: PieceMarkdown<PieceFrontmatter>,
	luzzle: string,
	template?: string
): Promise<string> {
	const internalTemplateDir = path.join(import.meta.dirname, './templates')
	const templateDir = template ? path.dirname(template) : internalTemplateDir
	const htmlTemplate = await readFile(path.join(internalTemplateDir, 'html.eta'))
	const simpleTemplate = await readFile(path.join(internalTemplateDir, 'simple.eta'))
	const size = { width: OpenGraphImageWidth, height: OpenGraphImageHeight }
	const helpers = {
		getDynamicFontSize,
		fontToBase64: (font: string) => fontToBase64(path.join(templateDir, font)),
		pieceExtractImage: (image: string, w: number, h: number) =>
			extractImage(path.join(luzzle, image), w, h),
	}
	const eta = new Eta({ views: templateDir, tags: ['[%', '%]'] })

	eta.loadTemplate('@html', htmlTemplate.toString(), { async: true })
	eta.loadTemplate('@simple', simpleTemplate.toString(), { async: true })

	if (!template) {
		const title = pieceMarkdown.frontmatter.title || pieceMarkdown.filePath
		const subtitle = pieceMarkdown.frontmatter.subtitle || pieceMarkdown.piece
		return await eta.renderAsync('@simple', { title, subtitle, size, helpers })
	} else {
		const pieceTemplateBuffer = await readFile(template)
		return await eta.renderStringAsync(pieceTemplateBuffer.toString(), { piece: pieceMarkdown, size, helpers })
	}
}

export { generateHtml }
