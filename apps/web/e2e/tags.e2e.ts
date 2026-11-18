import { expect, test } from './support/test.js'
import { fieldGuide, fieldNotesTag, notebook } from './support/fixture.js'

test('a tag keeps public titles and placeholders without JavaScript, then loads selected icons and opens a piece', async ({
	browser,
	baseURL,
	page
}) => {
	const tagUrl = `/tags/${fieldNotesTag.slug}`
	const noScript = await browser.newContext({ javaScriptEnabled: false, baseURL })
	try {
		const serverPage = await noScript.newPage()
		const response = await serverPage.goto(tagUrl)
		expect(response?.status()).toBe(200)
		const main = serverPage.getByRole('main')
		await expect(
			main.getByRole('heading', { name: `Tag: #${fieldNotesTag.slug}`, exact: true })
		).toHaveCount(1)
		for (const piece of [notebook, fieldGuide]) {
			const link = main.getByRole('link', { name: piece.title, exact: true })
			await expect(link).toBeVisible()
			await expect(link).toHaveJSProperty('href', new URL(piece.publicUrl, serverPage.url()).href)
			await expect(link.locator('.icon-placeholder')).toBeVisible()
		}
		await expect(main.locator('.poster, .recipe-card')).toHaveCount(0)
	} finally {
		await noScript.close()
	}

	await page.goto(tagUrl)
	const main = page.getByRole('main')
	const notebookLink = main.getByRole('link', { name: notebook.title, exact: true })
	const guideLink = main.getByRole('link', { name: fieldGuide.title, exact: true })
	await expect(notebookLink.locator('.poster .poster-title')).toHaveText(notebook.title)
	await expect(guideLink.locator('.recipe-card .card-title')).toHaveText(fieldGuide.title)
	await expect(main.locator('.icon-placeholder')).toHaveCount(0)

	await guideLink.click()
	await expect(page).toHaveURL(new URL(fieldGuide.publicUrl, baseURL!).href)
	await expect(page.getByRole('heading', { name: fieldGuide.title, exact: true })).toBeVisible()
})
