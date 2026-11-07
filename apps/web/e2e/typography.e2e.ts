import { expect, test } from './support/test.js'
import { notebook } from './support/fixture.js'

test('root font sizing responds to the viewport instead of staying fixed', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 900 })
	await page.goto(notebook.publicUrl)
	const phoneSize = await page
		.locator('html')
		.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))

	await page.setViewportSize({ width: 1440, height: 900 })
	const desktopSize = await page
		.locator('html')
		.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
	expect(phoneSize).toBeLessThan(desktopSize)
})

test('quoted paragraphs remain visually separated', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 900 })
	await page.goto(notebook.publicUrl)
	const quote = page.locator('main .markdown blockquote')
	const paragraphGap = await quote.evaluate((element) => {
		const [first, second] = element.querySelectorAll('p')
		return second.getBoundingClientRect().top - first.getBoundingClientRect().bottom
	})
	expect(paragraphGap).toBeGreaterThan(0)
})
