import type { Cookie, Page } from '@playwright/test'
import { expect, test } from './support/test.js'
import { ADMIN, fieldGuide, notebook } from './support/fixture.js'

const shareUrl = `${notebook.publishedUrl}/share`
const imagePath = `/assets/pieces/${notebook.slug}/share%20image.png?v=${notebook.publishedAt}`
const pngLink = (page: Page, title: string) =>
	page.getByRole('link', { name: `Open generated Takumi PNG for ${title} in a new tab` })
const pngImage = (page: Page, title: string) =>
	page
		.getByRole('region', { name: 'Image', exact: true })
		.getByRole('img', { name: `Generated share image for ${title}` })
let shareSession: Cookie[] | undefined
async function signIn(page: Page, destination: string) {
	if (shareSession) {
		await page.context().addCookies(shareSession)
		await page.goto(destination)
		return
	}
	await page.goto(destination)
	await page.locator('#svelte-announcer').waitFor({ state: 'attached' })
	await page.getByLabel('Username', { exact: true }).fill(ADMIN.username)
	await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
	await page.getByRole('button', { name: 'Sign in', exact: true }).click()
	await expect(page).toHaveURL(new URL(destination, page.url()).href)
	shareSession = await page.context().cookies()
}

test('Share opens its PNG, supports client navigation and reports a broken image', async ({
	page,
	baseURL
}) => {
	await signIn(page, notebook.publishedUrl)
	await page.evaluate(() => {
		document.documentElement.dataset.shareDocument = 'same-document'
	})
	const tabs = page.getByRole('navigation', { name: 'Published views' })
	await tabs.getByRole('link', { name: 'Share', exact: true }).click()
	const preview = page.getByRole('region', { name: 'HTML', exact: true })
	await expect(preview.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()
	const image = pngImage(page, notebook.title)
	await expect(image).toBeVisible()
	await expect(image).toHaveAttribute('src', `${baseURL}${imagePath}`)
	await expect
		.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
		.toBeGreaterThan(0)
	const link = pngLink(page, notebook.title)
	await expect(link).toHaveAttribute('href', `${baseURL}${imagePath}`)
	await expect(link).toHaveAttribute('target', '_blank')
	const opened = page.waitForEvent('popup')
	await image.click()
	const popup = await opened
	await popup.waitForLoadState()
	await expect(popup).toHaveURL(`${baseURL}${imagePath}`)
	await expect
		.poll(() => popup.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
		.toBeGreaterThan(0)
	await popup.close()

	await tabs.getByRole('link', { name: 'Overview', exact: true }).click()
	await expect(page).toHaveURL(`${baseURL}${notebook.publishedUrl}`)
	await expect(page.locator('html')).toHaveAttribute('data-share-document', 'same-document')
	await expect(preview).toHaveCount(0)

	// A recorded PNG can disappear independently of the browser composition.
	await page.route(`**${imagePath}`, (route) => route.fulfill({ status: 404, body: 'Not found' }))
	await page.goto(shareUrl)
	await expect(
		page.getByRole('region', { name: 'Image', exact: true }).getByRole('status')
	).toHaveText('The generated image could not be loaded.')
	await expect(image).toHaveCount(0)
	await expect(link).toHaveText('Open image')
	await expect(link).toBeVisible()
	await expect(link).toHaveAttribute('href', `${baseURL}${imagePath}`)
	await expect(preview.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()
})

test('without JavaScript Share renders the authored card for the current record alongside its PNG', async ({
	page,
	browser,
	appServer
}) => {
	await signIn(page, notebook.publishedUrl)
	const context = await browser.newContext({
		javaScriptEnabled: false,
		storageState: await page.context().storageState()
	})
	try {
		const shell = await context.newPage()
		const job = appServer.previews.notebook
		const privateAsset = (file: string) => `/admin/preview/${job}/asset/${encodeURIComponent(file)}`
		const html = shell.getByRole('region', { name: 'HTML', exact: true })
		for (const [url, title, summary, cover, png] of [
			[
				shareUrl,
				notebook.title,
				notebook.caption,
				`${appServer.origin}/assets/pieces/${notebook.slug}/published%20meteor.png`,
				`${appServer.origin}${imagePath}`
			],
			[
				`/admin/view/preview/${job}/share`,
				notebook.previewTitle,
				notebook.previewCaption,
				privateAsset(notebook.previewAsset),
				privateAsset(notebook.previewShareAsset)
			]
		]) {
			const response = await shell.goto(new URL(url, appServer.origin).href)
			expect(response?.headers()['cache-control']).toBe('private, no-store')
			await expect(html.getByRole('heading', { name: title, exact: true })).toBeVisible()
			await expect(html.getByRole('article')).toHaveCSS('--fixture-share-style', 'applied')
			await expect(html.getByText(summary, { exact: true })).toBeVisible()
			await expect(html.getByRole('img', { name: 'Share card cover' })).toHaveAttribute(
				'src',
				cover
			)
			await expect(pngLink(shell, title)).toHaveAttribute('href', png)
			await expect(pngImage(shell, title)).toBeVisible()
		}
		// The generic card is also rendered on the server without a recorded PNG.
		await shell.goto(new URL(`${fieldGuide.publishedUrl}/share`, appServer.origin).href)
		await expect(html.getByRole('heading', { name: fieldGuide.title, exact: true })).toBeVisible()
		await expect(html.getByRole('heading', { name: 'by Olivia Sharer' })).toBeVisible()
		await expect(shell.getByRole('main')).toContainText('No generated image available.')
		await expect(shell.getByRole('link', { name: /Open generated Takumi PNG/ })).toHaveCount(0)
	} finally {
		await context.close()
	}
})

test('a per-record authored HTML failure leaves the private generated PNG usable', async ({
	page,
	appServer
}) => {
	const job = appServer.previews.failedShare
	await signIn(page, `/admin/view/preview/${job}/share`)
	await expect(page.getByRole('alert')).toHaveText(
		'The configured share HTML could not be rendered.'
	)
	await expect(page.getByRole('main')).not.toContainText('Private missing summary')
	const image = pngImage(page, notebook.previewTitle)
	await expect(image).toBeVisible()
	await expect
		.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
		.toBeGreaterThan(0)
	await expect(pngLink(page, notebook.previewTitle)).toHaveAttribute(
		'href',
		`/admin/preview/${job}/asset/${encodeURIComponent(notebook.previewShareAsset)}`
	)
})
