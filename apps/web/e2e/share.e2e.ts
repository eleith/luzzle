import type { Cookie, Page } from '@playwright/test'
import { expect, test } from './support/test.js'
import { ADMIN, fieldGuide, notebook } from './support/fixture.js'

const shareUrl = `${notebook.publishedUrl}/share`
const imagePath = `/pieces/assets/${notebook.slug}/share%20image.png?v=${notebook.publishedAt}`
const previewImagePath = (job: string) =>
	`/admin/preview/${job}/asset/${encodeURIComponent(fieldGuide.previewShareAsset)}`
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

test('Share opens its PNG, supports client navigation and reports missing generated output', async ({
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

	// A published piece without a recorded PNG still renders its actual HTML composition.
	await page.goto(`${fieldGuide.publishedUrl}/share`)
	await expect(preview.getByRole('heading', { name: fieldGuide.title, exact: true })).toBeVisible()
	await expect(page.getByRole('main')).toContainText('No generated image available.')
	await expect(page.getByRole('link', { name: /Open generated Takumi PNG/ })).toHaveCount(0)
})

test('Share displays its PNG or missing-output guidance without JavaScript', async ({
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
		for (const [url, title, image] of [
			[shareUrl, notebook.title, `${appServer.origin}${imagePath}`],
			[
				`/admin/view/preview/${appServer.previews.completed}/share`,
				fieldGuide.previewTitle,
				previewImagePath(appServer.previews.completed)
			]
		]) {
			const response = await shell.goto(new URL(url, appServer.origin).href)
			expect(response?.headers()['cache-control']).toBe('private, no-store')
			await expect(shell.getByRole('region', { name: 'HTML', exact: true })).toBeVisible()
			await expect(shell.getByRole('status')).toHaveText('Loading browser preview…')
			await expect(shell.locator('noscript p')).toHaveText(
				'JavaScript is required to display the browser preview.'
			)
			await expect(shell.locator('noscript p')).toBeVisible()
			await expect(pngLink(shell, title)).toHaveAttribute('href', image)
			await expect(pngLink(shell, title)).toBeVisible()
			await expect(pngImage(shell, title)).toHaveAttribute('src', image)
			await expect(pngImage(shell, title)).toBeVisible()
			await expect
				.poll(() => pngImage(shell, title).evaluate((img: HTMLImageElement) => img.naturalWidth))
				.toBeGreaterThan(0)
			await expect(shell.locator('.opengraph-canvas')).toHaveCount(0)
		}
		await shell.goto(new URL(`${fieldGuide.publishedUrl}/share`, appServer.origin).href)
		await expect(shell.getByRole('main')).toContainText('No generated image available.')
		await expect(shell.getByRole('link', { name: /Open generated Takumi PNG/ })).toHaveCount(0)
	} finally {
		await context.close()
	}
})

test('a failed OG import keeps the generated PNG visible and Reload recovers the browser preview', async ({
	page,
	appServer
}) => {
	await signIn(page, `/admin/view/preview/${appServer.previews.completed}`)
	let rejected = false
	await page.route('**/*.js', async (route) => {
		const response = await route.fetch()
		// Book OG has both of these markup elements; the Page's Book icon does not.
		const module = await response.text()
		if (module.includes('book-cover-front') && module.includes('right-panel')) {
			rejected = true
			return route.abort('failed')
		}
		await route.fulfill({ response })
	})
	await page
		.getByRole('navigation', { name: 'Preview views' })
		.getByRole('link', { name: 'share', exact: true })
		.click()
	await expect(page.getByRole('alert')).toHaveText('The browser preview could not be loaded.')
	expect(rejected).toBe(true)
	await expect(page.locator('.opengraph-canvas')).toHaveCount(0)
	await expect(page.getByRole('status')).toHaveCount(0)
	await expect(pngLink(page, fieldGuide.previewTitle)).toHaveAttribute(
		'href',
		previewImagePath(appServer.previews.completed)
	)
	await expect(pngImage(page, fieldGuide.previewTitle)).toBeVisible()
	await expect
		.poll(() =>
			pngImage(page, fieldGuide.previewTitle).evaluate((img: HTMLImageElement) => img.naturalWidth)
		)
		.toBeGreaterThan(0)
	await page.unroute('**/*.js')
	await page.getByRole('button', { name: 'Reload', exact: true }).click()
	await expect(
		page
			.locator('.opengraph-canvas')
			.getByRole('heading', { name: fieldGuide.previewTitle, exact: true })
	).toBeVisible()
	await expect(page.getByRole('alert')).toHaveCount(0)
	await expect(pngImage(page, fieldGuide.previewTitle)).toBeVisible()
	await expect
		.poll(() =>
			pngImage(page, fieldGuide.previewTitle).evaluate((img: HTMLImageElement) => img.naturalWidth)
		)
		.toBeGreaterThan(0)
})
