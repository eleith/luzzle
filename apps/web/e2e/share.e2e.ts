import { expect, test } from './support/test.js'
import { ADMIN, notebook } from './support/fixture.js'

const shareUrl = notebook.editorUrl.replace(/source$/, 'published/share')
const imagePath = `/pieces/assets/${notebook.slug}/share%20image.png?v=${notebook.publishedAt}`

test('Share fits mobile and desktop, opens the recorded PNG, and reports a missing file', async ({
	page,
	baseURL
}) => {
	await page.goto(shareUrl)
	await page.locator('#svelte-announcer').waitFor({ state: 'attached' })
	await page.getByLabel('Username', { exact: true }).fill(ADMIN.username)
	await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
	await page.getByRole('button', { name: 'Sign in', exact: true }).click()
	await expect(page).toHaveURL(`${baseURL}${shareUrl}`)

	const image = page.getByRole('img', { name: `Share image for ${notebook.title}` })
	await expect(image).toBeVisible()
	await expect
		.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
		.toBeGreaterThan(0)
	await expect(image).toHaveAttribute('src', `${baseURL}${imagePath}`)
	for (const viewport of [
		{ width: 390, height: 844 },
		{ width: 1440, height: 900 },
		{ width: 900, height: 500 }
	]) {
		await page.setViewportSize(viewport)
		const bounds = await image.boundingBox()
		expect(bounds).not.toBeNull()
		expect(bounds!.x).toBeGreaterThanOrEqual(0)
		expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width)
		expect(bounds!.height).toBeLessThanOrEqual(viewport.height)
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			viewport.width
		)
	}

	const opened = page.waitForEvent('popup')
	await image.click()
	const popup = await opened
	await popup.waitForLoadState()
	await expect(popup).toHaveURL(`${baseURL}${imagePath}`)
	await expect
		.poll(() => popup.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
		.toBeGreaterThan(0)
	await popup.close()

	// A recorded asset can disappear independently of its database record.
	await page.route(`**${imagePath}`, (route) => route.fulfill({ status: 404, body: 'Not found' }))
	await page.reload()
	await expect(page.getByRole('status')).toHaveText(
		'The generated share image could not be loaded.'
	)
	await expect(image).toHaveCount(0)
	await expect(
		page.getByRole('link', { name: `Open share image for ${notebook.title} in a new tab` })
	).toHaveAttribute('href', `${baseURL}${imagePath}`)
})
