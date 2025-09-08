import pieceToHtml from './utils/html.js'
import { temporaryWrite } from 'tempy'
import { PieceMarkdown, PieceFrontmatter } from '@luzzle/cli'
import puppeteer, { Browser } from 'puppeteer'

const OpenGraphImageWidth = 1200
const OpenGraphImageHeight = 630

async function initializeBrowser(): Promise<Browser> {
	const launchArgs = [
		'--no-sandbox',
		'--disable-setuid-sandbox',
		'--disable-dev-shm-usage',
		'--disable-accelerated-2d-canvas',
		'--disable-gpu',
	]

	const browser = await puppeteer.launch({
		headless: true,
		args: launchArgs,
	})
	console.log('Browser initialized.')
	return browser
}

async function shutdownBrowser(browser: Browser) {
	await browser.close()
	console.log('Browser shut down.')
}

export async function generateOgImage(html: string) {
	const browser = await initializeBrowser()

	try {
		const page = await browser.newPage()

		await page.setViewport({
			width: 1200,
			height: 630,
		})

		await page.setContent(html, { waitUntil: 'networkidle0' })

		const imageBuffer = await page.screenshot({
			type: 'png',
		})

		return imageBuffer
	} catch (error) {
		console.error('Error generating image:', error)
		throw new Error('Failed to generate image with Puppeteer.')
	} finally {
		await shutdownBrowser(browser)
	}
}

async function generateOpenGraphForPiece(
	piece: PieceMarkdown<PieceFrontmatter>,
	templates: string,
	format: 'html' | 'svg' | 'png',
	luzzle: string
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
		const png = await generateOgImage(html)
		return await temporaryWrite(png, { extension: 'png' })
	} else {
		return await temporaryWrite(html, { extension: 'html' })
	}
}

export { generateOpenGraphForPiece }
