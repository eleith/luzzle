import { Browser } from 'puppeteer'
import pieceToHtml from './utils/html.js'
import { PieceMarkdown, PieceFrontmatter } from '@luzzle/cli'

const OpenGraphImageWidth = 1200
const OpenGraphImageHeight = 630

export async function generateOgImage(html: string, browser: Browser) {
	const page = await browser.newPage()

	try {
		await page.setViewport({
			width: 1200,
			height: 630,
		})

		await page.setContent(html, { waitUntil: 'networkidle0' })

		const imageBuffer = await page.screenshot({
			type: 'png',
		})

		await page.close()

		return imageBuffer
	} catch (error) {
		throw new Error(`Failed to generate image with Puppeteer: ${error}`)
	} finally {
		await page.close()
	}
}

async function generateOpenGraphForPiece(
	piece: PieceMarkdown<PieceFrontmatter>,
	templates: string,
	format: 'html' | 'svg' | 'png',
	luzzle: string,
	browser: Browser
) {
	const html = await pieceToHtml(piece, {
		size: {
			width: OpenGraphImageWidth,
			height: OpenGraphImageHeight,
		},
		luzzle,
		templates,
	})

	if (format === 'png') {
		return await generateOgImage(html, browser)
	} else {
		return html
	}
}

export { generateOpenGraphForPiece }
