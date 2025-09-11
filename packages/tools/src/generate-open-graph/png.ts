import { Browser } from 'puppeteer'

async function generatePng(
	html: string,
	browser: Browser,
) {
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

		return imageBuffer
	} catch (error) {
		throw new Error(`Failed to generate image with Puppeteer: ${error}`)
	} finally {
		await page.close()
	}
}

export { generatePng }
