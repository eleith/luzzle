import type { Cookie, Page } from '@playwright/test'
import { expect, test } from './support/test.js'
import { ADMIN, fieldGuide, notebook } from './support/fixture.js'
import {
	bookOpengraphCSS,
	expectPreviewLoading,
	expectPreviewLoadingThemeAndMotion,
	opengraphScopes,
	styles
} from './support/viewer-styles.js'

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
const rootFont = (page: Page) =>
	page.locator('html').evaluate((element) => parseFloat(getComputedStyle(element).fontSize))

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

test('Share scales HTML and PNG across viewports, opens the PNG, restores root sizing on exit and reports missing files', async ({
	page,
	baseURL
}) => {
	await page.setViewportSize({ width: 390, height: 844 })
	await signIn(page, notebook.publishedUrl)
	const originalRootFont = await rootFont(page)
	expect(opengraphScopes(await styles(page))).toEqual([])
	const generatedRequests: string[] = []
	page.on('request', (request) => {
		if (request.url() === `${baseURL}${imagePath}`) generatedRequests.push(request.url())
	})
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
	// The fixture's nonstandard PNG dimensions must fit too, without stretching.
	await expect(image).toHaveCSS('object-fit', 'contain')
	const canvas = preview.locator('.opengraph-canvas')
	const title = canvas.getByRole('heading', { name: notebook.title, exact: true })
	const titleSize = await title.evaluate((element) => getComputedStyle(element).fontSize)
	const workerRootFont = await page
		.locator('html')
		.evaluate((element) =>
			parseFloat(getComputedStyle(element).getPropertyValue('--font-size-root'))
		)
	await expect(canvas).toHaveCSS('width', '1200px')
	await expect(canvas).toHaveCSS('height', '630px')
	for (const viewport of [
		{ width: 390, height: 844 },
		{ width: 1440, height: 900 },
		{ width: 900, height: 500 }
	]) {
		await page.setViewportSize(viewport)
		await expect(title).toHaveCSS('font-size', titleSize)
		expect(await rootFont(page)).toBe(workerRootFont)
		// ResizeObserver updates the transform asynchronously; measure the rendered canvas,
		// not just its clipped wrapper, and require the wrapper to reserve the same height.
		await expect(async () => {
			const canvasBounds = await canvas.boundingBox()
			const frameBounds = await preview.locator('.scale-container').boundingBox()
			const pngBounds = await image.boundingBox()
			expect(canvasBounds, 'HTML canvas has rendered bounds').not.toBeNull()
			expect(frameBounds, 'HTML frame reserves layout space').not.toBeNull()
			expect(pngBounds, 'Generated PNG has rendered bounds').not.toBeNull()
			expect(canvasBounds!.width, 'Scaled HTML canvas has positive width').toBeGreaterThan(0)
			expect(canvasBounds!.x, 'HTML canvas fits the left viewport edge').toBeGreaterThanOrEqual(0)
			expect(
				canvasBounds!.x + canvasBounds!.width,
				'HTML canvas fits the right viewport edge'
			).toBeLessThanOrEqual(viewport.width + 1)
			expect(
				canvasBounds!.height,
				'HTML canvas fits the viewport height budget'
			).toBeLessThanOrEqual(viewport.height * 0.8 + 1)
			expect(
				canvasBounds!.width / canvasBounds!.height,
				'Scaled HTML keeps the 1200:630 aspect ratio'
			).toBeCloseTo(1200 / 630, 2)
			expect(
				Math.abs(frameBounds!.height - canvasBounds!.height),
				'HTML frame reserves the scaled canvas height'
			).toBeLessThan(1)
			expect(
				Math.abs(frameBounds!.width - canvasBounds!.width),
				'HTML frame reserves the scaled canvas width'
			).toBeLessThan(1)
			expect(pngBounds!.x, 'PNG fits the left viewport edge').toBeGreaterThanOrEqual(0)
			expect(
				pngBounds!.x + pngBounds!.width,
				'PNG fits the right viewport edge'
			).toBeLessThanOrEqual(viewport.width + 1)
			expect(pngBounds!.height, 'PNG fits the viewport height budget').toBeLessThanOrEqual(
				viewport.height * 0.8 + 1
			)
			expect(pngBounds!.y, 'PNG sits below the HTML canvas without overlap').toBeGreaterThanOrEqual(
				canvasBounds!.y + canvasBounds!.height
			)
			expect(
				Math.abs(pngBounds!.width - canvasBounds!.width),
				'PNG and HTML use the same frame width'
			).toBeLessThan(1)
		}).toPass({ timeout: 5000 })
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			viewport.width
		)
	}
	expect(generatedRequests).toEqual([`${baseURL}${imagePath}`])
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

	await page.setViewportSize({ width: 390, height: 844 })
	await tabs.getByRole('link', { name: 'Overview', exact: true }).click()
	await expect(page).toHaveURL(`${baseURL}${notebook.publishedUrl}`)
	await expect(page.locator('html')).toHaveAttribute('data-share-document', 'same-document')
	await expect(canvas).toHaveCount(0)
	await expect.poll(() => rootFont(page)).toBe(originalRootFont)
	expect(originalRootFont).toBeLessThan(workerRootFont)
	// Share CSS remains installed after Kit navigation; only the scoped :has stops matching.
	expect(opengraphScopes(await styles(page))).toHaveLength(1)

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
	await expect(title).toBeVisible()

	// A published piece without a recorded PNG still renders its actual HTML composition.
	await page.goto(`${fieldGuide.publishedUrl}/share`)
	await expect(preview.getByRole('heading', { name: fieldGuide.title, exact: true })).toBeVisible()
	await expect(page.getByRole('main')).toContainText('No generated image available.')
	await expect(page.getByRole('link', { name: /Open generated Takumi PNG/ })).toHaveCount(0)
})

test('fresh Share SSR has no OG CSS and displays the PNG or missing-output guidance without JavaScript', async ({
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
			expect(opengraphScopes(await styles(shell))).toEqual([])
		}
		await shell.goto(new URL(`${fieldGuide.publishedUrl}/share`, appServer.origin).href)
		await expect(shell.getByRole('main')).toContainText('No generated image available.')
		await expect(shell.getByRole('link', { name: /Open generated Takumi PNG/ })).toHaveCount(0)
		expect(opengraphScopes(await styles(shell))).toEqual([])
	} finally {
		await context.close()
	}
})

test('Share waits for only the chosen OG stylesheet while the recorded PNG remains visible', async ({
	page,
	appServer
}) => {
	await page.setViewportSize({ width: 390, height: 844 })
	const previewUrl = `/admin/view/preview/${appServer.previews.completed}`
	await signIn(page, previewUrl)
	expect(opengraphScopes(await styles(page))).toEqual([])
	const release = Promise.withResolvers<void>()
	let held = false
	const loadingCanvas = page.locator('.loading-canvas')
	const image = pngImage(page, fieldGuide.previewTitle)
	let loadingBounds: Awaited<ReturnType<typeof loadingCanvas.boundingBox>> = null
	let pngBounds: Awaited<ReturnType<typeof image.boundingBox>> = null
	await page.route('**/*.css', async (route) => {
		const response = await route.fetch()
		if (bookOpengraphCSS.test(await response.text())) {
			held = true
			await release.promise
		}
		await route.fulfill({ response })
	})
	try {
		await page
			.getByRole('navigation', { name: 'Preview views' })
			.getByRole('link', { name: 'share', exact: true })
			.click()
		await expect.poll(() => held).toBe(true)
		await expect(page.getByRole('status')).toHaveText('Loading browser preview…')
		await expectPreviewLoading(loadingCanvas, 'Loading browser preview…')
		await expectPreviewLoadingThemeAndMotion(page, loadingCanvas)
		await expect(page.locator('.opengraph-canvas')).toHaveCount(0)
		await expect(pngLink(page, fieldGuide.previewTitle)).toHaveAttribute(
			'href',
			previewImagePath(appServer.previews.completed)
		)
		await expect(pngImage(page, fieldGuide.previewTitle)).toBeVisible()
		await expect
			.poll(() =>
				pngImage(page, fieldGuide.previewTitle).evaluate(
					(img: HTMLImageElement) => img.naturalWidth
				)
			)
			.toBeGreaterThan(0)
		expect(opengraphScopes(await styles(page))).toEqual([])
		loadingBounds = await loadingCanvas.boundingBox()
		pngBounds = await image.boundingBox()
		expect(loadingBounds).not.toBeNull()
		expect(pngBounds).not.toBeNull()
		expect(loadingBounds!.width / loadingBounds!.height).toBeCloseTo(1200 / 630, 2)
	} finally {
		release.resolve()
	}
	const canvas = page.locator('.opengraph-canvas')
	await expect(
		canvas.getByRole('heading', { name: fieldGuide.previewTitle, exact: true })
	).toBeVisible()
	await expect(canvas.getByRole('heading', { name: 'by Olivia Sharer', exact: true })).toBeVisible()
	await expect(loadingCanvas).toHaveCount(0)
	// Resolving the HTML preview must occupy the reserved frame and leave the PNG in place.
	for (const [name, locator, before] of [
		['HTML canvas', canvas, loadingBounds],
		['PNG', image, pngBounds]
	] as const) {
		await expect(async () => {
			const after = await locator.boundingBox()
			expect(before, `${name} has reserved loading bounds`).not.toBeNull()
			expect(after, `${name} has rendered bounds after loading`).not.toBeNull()
			for (const dimension of ['x', 'y', 'width', 'height'] as const) {
				expect(
					Math.abs(after![dimension] - before![dimension]),
					`${name} preserves its reserved ${dimension} after the HTML resolves`
				).toBeLessThan(1)
			}
		}).toPass({ timeout: 5000 })
	}
	const css = await styles(page)
	expect(css).toMatch(bookOpengraphCSS)
	expect(opengraphScopes(css)).toEqual([css.match(bookOpengraphCSS)![1]])
	expect(css).not.toMatch(/\.hero-icon|\.book-spine|\.recipe-card/)
})

test('a failed OG import keeps the generated PNG visible and Reload recovers the browser preview', async ({
	page,
	appServer
}) => {
	await signIn(page, `/admin/view/preview/${appServer.previews.completed}`)
	let rejected = false
	await page.route('**/*.css', async (route) => {
		const response = await route.fetch()
		if (bookOpengraphCSS.test(await response.text())) {
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
	await page.unroute('**/*.css')
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
