import { expect, test } from './support/test.js'
import { notebook } from './support/fixture.js'

test('root typography scales from the mobile minimum to the desktop size', async ({ page }) => {
	await page.goto(notebook.publicUrl)

	for (const [width, fontSize] of [
		[390, '17.6px'],
		[704, '19.8px'],
		[1440, '22px']
	] as const) {
		await page.setViewportSize({ width, height: 900 })
		await expect(page.locator('html')).toHaveCSS('font-size', fontSize)
	}
})
