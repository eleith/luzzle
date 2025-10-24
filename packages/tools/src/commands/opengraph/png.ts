import { Browser } from 'puppeteer'

async function generatePng(
	html: string,
	browser: Browser,
	outputFilePath: string,
) {
	const page = await browser.newPage()

	try {
		await page.setViewport({
			width: 1200,
			height: 630,
		})
		await page.setContent(html)

		return await page.screenshot({
			path: `${outputFilePath.replace(/\.png$/, '')}.png`,
		})
	} catch (error) {
		throw new Error(`Failed to generate image with Puppeteer: ${error}`)
	/* v8 ignore next line */
	} finally {
		await page.close()
	}
}

export { generatePng }
