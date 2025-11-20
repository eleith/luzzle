import { mkdir } from 'fs/promises'
import path from 'path'
import { Browser } from 'puppeteer'

async function generatePng(
	html: string,
	browser: Browser,
	outputFilePath: string,
) {
	const page = await browser.newPage()
	const directory = path.dirname(outputFilePath)

	try {
		await page.setViewport({
			width: 1200,
			height: 630,
		})
		await page.setContent(html)
	  await mkdir(directory, { recursive: true })

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
