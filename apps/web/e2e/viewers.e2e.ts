import type { Cookie, Page } from '@playwright/test'
import { expect, test } from './support/test.js'
import { ADMIN, completePendingPreview, fieldGuide, notebook } from './support/fixture.js'
import {
	bookOpengraphCSS,
	expectPreviewLoading,
	opengraphScopes,
	styles
} from './support/viewer-styles.js'

let viewerSession: Cookie[] | undefined

async function signIn(page: Page, destination: string) {
	// Keep contexts/module caches isolated without repeatedly exercising the login rate limit.
	if (viewerSession) {
		await page.context().addCookies(viewerSession)
		await page.goto(destination)
		return
	}
	await page.goto(destination)
	await page.locator('#svelte-announcer').waitFor({ state: 'attached' })
	await page.getByLabel('Username', { exact: true }).fill(ADMIN.username)
	await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
	await page.getByRole('button', { name: 'Sign in', exact: true }).click()
	await expect(page).toHaveURL(new URL(destination, page.url()).href)
	viewerSession = await page.context().cookies()
}

const previewUrl = (job: string) => `/admin/view/preview/${job}`
const assetUrl = (job: string) =>
	`/admin/preview/${job}/asset/${encodeURIComponent(fieldGuide.previewAsset)}`
const shareAssetUrl = (job: string) =>
	`/admin/preview/${job}/asset/${encodeURIComponent(fieldGuide.previewShareAsset)}`

test('new viewer HTML/data and preview PNG/stream stay private; login returns to the requested Share tab', async ({
	page,
	request,
	appServer
}) => {
	const preview = previewUrl(appServer.previews.completed)
	for (const viewer of [`${fieldGuide.publishedUrl}/page`, `${preview}/share`]) {
		for (const suffix of ['', '/__data.json']) {
			const response = await request.get(`${viewer}${suffix}`, {
				maxRedirects: 0,
				headers: { accept: 'text/html' }
			})
			const body = await response.text()
			expect(body).not.toContain(fieldGuide.previewTitle)
			expect(body).not.toContain(fieldGuide.file)
			if (!suffix) {
				expect(response.status()).toBe(302)
				expect(response.headers().location).toContain('/signin?')
			} else {
				// Kit transports redirects inside its data response rather than an HTTP redirect.
				expect(body).toContain('/signin?')
			}
		}
	}
	for (const url of [
		assetUrl(appServer.previews.completed),
		shareAssetUrl(appServer.previews.completed),
		`/api/admin/preview/${appServer.previews.completed}/stream`
	]) {
		const response = await request.get(url)
		expect(response.status()).toBe(401)
		expect(response.headers()['cache-control']).toBe('private, no-store')
		expect(await response.text()).not.toContain(fieldGuide.previewTitle)
	}

	const generatedRequests: string[] = []
	page.on('request', (request) => {
		if (new URL(request.url()).pathname === shareAssetUrl(appServer.previews.completed))
			generatedRequests.push(request.url())
	})
	await signIn(page, `${preview}/share`)
	await expect(
		page
			.getByRole('navigation', { name: 'Preview views' })
			.getByRole('link', { name: 'share', exact: true })
	).toHaveAttribute('aria-current', 'page')
	const previewRegion = page.getByRole('region', { name: 'HTML', exact: true })
	await expect(
		previewRegion.getByRole('heading', { name: fieldGuide.previewTitle, exact: true })
	).toBeVisible()
	await expect(
		previewRegion.getByRole('heading', { name: 'by Olivia Sharer', exact: true })
	).toBeVisible()
	const cover = previewRegion.locator('.opengraph-canvas .book-cover img')
	await expect(cover).toHaveAttribute('src', assetUrl(appServer.previews.completed))
	await expect
		.poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth))
		.toBeGreaterThan(0)
	await expect(
		page.getByRole('link', {
			name: `Open generated Takumi PNG for ${fieldGuide.previewTitle} in a new tab`
		})
	).toHaveAttribute('href', shareAssetUrl(appServer.previews.completed))
	const generatedImage = page
		.getByRole('region', { name: 'Image', exact: true })
		.getByRole('img', { name: `Generated share image for ${fieldGuide.previewTitle}` })
	await expect(generatedImage).toHaveAttribute('src', shareAssetUrl(appServer.previews.completed))
	await expect(generatedImage).toBeVisible()
	await expect
		.poll(() => generatedImage.evaluate((img: HTMLImageElement) => img.naturalWidth))
		.toBeGreaterThan(0)
	expect(generatedRequests).toEqual([
		new URL(shareAssetUrl(appServer.previews.completed), appServer.origin).href
	])
	const png = await page.request.get(shareAssetUrl(appServer.previews.completed))
	expect(png.status()).toBe(200)
	expect(png.headers()['content-type']).toBe('image/png')
	expect(png.headers()['cache-control']).toBe('private, no-store')
	expect((await png.body()).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
	const data = await page.request.get(`${preview}/share/__data.json`)
	expect(data.headers()['cache-control']).toBe('private, no-store')
	expect(await data.text()).toContain(fieldGuide.previewTitle)
	const css = await styles(page)
	expect(css).toMatch(bookOpengraphCSS)
	expect(opengraphScopes(css)).toEqual([css.match(bookOpengraphCSS)![1]])
	expect(css).not.toMatch(/\.recipe-card|\.book-spine|\.hero-icon/)
})

test('published Page and Icon are client-only, select independent CSS, wait for styles and reuse native imports', async ({
	page,
	browser
}, testInfo) => {
	await signIn(page, fieldGuide.publishedUrl)
	const noScript = await browser.newContext({
		javaScriptEnabled: false,
		storageState: await page.context().storageState()
	})
	try {
		const shell = await noScript.newPage()
		for (const tab of ['page', 'icon']) {
			const response = await shell.goto(
				new URL(`${fieldGuide.publishedUrl}/${tab}`, page.url()).href
			)
			expect(response?.headers()['cache-control']).toBe('private, no-store')
			await expect(shell.getByRole('navigation', { name: 'Published views' })).toBeVisible()
			// Playwright's text engine intentionally skips noscript content.
			await expect(shell.locator('noscript p')).toHaveText(
				`JavaScript is required to display the ${tab} preview.`
			)
			await expect(shell.locator('noscript p')).toBeVisible()
			await expect(shell.getByRole('main')).toHaveCount(1)
			await expect(shell.locator('.book, .recipe-card')).toHaveCount(0)
			expect(await styles(shell)).not.toMatch(/\.book-cover|\.recipe-card/)
			expect(opengraphScopes(await styles(shell))).toEqual([])
		}
	} finally {
		await noScript.close()
	}

	const requests: string[] = []
	page.on('request', (request) => {
		if (/\.(?:css|js)(?:\?|$)/.test(request.url())) requests.push(request.url())
	})
	const tabs = page.getByRole('navigation', { name: 'Published views' })
	await tabs.getByRole('link', { name: 'Page', exact: true }).click()
	await expect(page.getByRole('heading', { name: fieldGuide.title, exact: true })).toBeVisible()
	await expect(page.locator('.hero-icon .book')).toBeVisible()
	expect(await styles(page)).toContain('.book-cover')
	expect(await styles(page)).not.toContain('.recipe-card')
	expect(opengraphScopes(await styles(page))).toEqual([])

	// Hold the chosen Icon's actual production stylesheet, not the whole route or app shell.
	const release = Promise.withResolvers<void>()
	let held = false
	let iconStylesheetRequests = 0
	await page.route('**/*.css', async (route) => {
		const response = await route.fetch()
		if ((await response.text()).includes('.recipe-card')) {
			iconStylesheetRequests++
			held = true
			await release.promise
		}
		await route.fulfill({ response })
	})
	try {
		await tabs.getByRole('link', { name: 'Icon', exact: true }).click()
		await expect.poll(() => held).toBe(true)
		await expect(page.getByRole('status')).toHaveText('Loading icon preview…')
		await expect(page.getByRole('main')).toHaveCount(1)
		await expectPreviewLoading(page.getByRole('main'), 'Loading icon preview…')
		await expect(page.locator('.recipe-card, .book')).toHaveCount(0)
		// Navigation while the import is pending must not restore the obsolete renderer.
		await tabs.getByRole('link', { name: 'Page', exact: true }).click()
		await expect(page.getByRole('heading', { name: fieldGuide.title, exact: true })).toBeVisible()
	} finally {
		release.resolve()
	}
	await expect.poll(async () => (await styles(page)).includes('.recipe-card')).toBe(true)
	await expect(page.locator('.recipe-card')).toHaveCount(0)
	await tabs.getByRole('link', { name: 'Icon', exact: true }).click()
	await expect(page.locator('.recipe-card')).toBeVisible()
	await expect(page.locator('.recipe-card .card-title')).toHaveText(fieldGuide.title)
	await expect(page.locator('.book')).toHaveCount(0)
	expect(opengraphScopes(await styles(page))).toEqual([])
	await expect(tabs.getByRole('link', { name: 'Icon', exact: true })).toHaveAttribute(
		'aria-current',
		'page'
	)
	await expect(page.getByRole('link', { name: 'Back to editor' })).toHaveAttribute(
		'href',
		fieldGuide.editorUrl
	)
	for (const width of [390, 1440]) {
		await page.setViewportSize({ width, height: 900 })
		await expect(async () => {
			const iconBounds = await page.locator('.recipe-card').boundingBox()
			expect(iconBounds, 'Icon has rendered bounds').not.toBeNull()
			expect(iconBounds!.x, 'Icon fits the left viewport edge').toBeGreaterThanOrEqual(0)
			expect(
				iconBounds!.x + iconBounds!.width,
				'Icon fits the right viewport edge'
			).toBeLessThanOrEqual(width)
		}).toPass({ timeout: 5000 })
	}
	const firstVisit = [...requests]
	await tabs.getByRole('link', { name: 'Page', exact: true }).click()
	await expect(page.locator('.hero-icon .book')).toBeVisible()
	await tabs.getByRole('link', { name: 'Icon', exact: true }).click()
	await expect(page.locator('.recipe-card')).toBeVisible()
	expect(iconStylesheetRequests).toBe(1)
	expect(requests).toEqual(firstVisit)
	await testInfo.attach('viewer-module-requests.json', {
		body: JSON.stringify(requests, null, 2),
		contentType: 'application/json'
	})
})

test('a pending Icon import cannot replace the new template on a same-route piece transition', async ({
	page
}) => {
	await signIn(page, fieldGuide.publishedUrl)
	const obsoleteCSS = Promise.withResolvers<void>()
	let held = false
	await page.route('**/*.css', async (route) => {
		const response = await route.fetch()
		if ((await response.text()).includes('.recipe-card')) {
			held = true
			await obsoleteCSS.promise
		}
		await route.fulfill({ response })
	})
	try {
		await page.getByRole('link', { name: 'Icon', exact: true }).click()
		await expect.poll(() => held).toBe(true)
		await expect(page.getByRole('status')).toHaveText('Loading icon preview…')
		// Both URLs use the same Kit route/component: changing tabs would only test unmount.
		await page.evaluate((href) => {
			document.documentElement.dataset.iconTransition = 'same-document'
			document.documentElement.dataset.obsoleteIcon = 'false'
			new MutationObserver((mutations) => {
				if (
					mutations.some((mutation) =>
						Array.from(mutation.addedNodes).some(
							(node) =>
								node instanceof Element &&
								(node.matches('.recipe-card') || node.querySelector('.recipe-card'))
						)
					)
				)
					document.documentElement.dataset.obsoleteIcon = 'true'
			}).observe(document.body, { childList: true, subtree: true })
			const link = document.createElement('a')
			link.href = href
			link.textContent = 'Open notebook icon'
			document.body.append(link)
		}, `${notebook.publishedUrl}/icon`)
		await page.getByRole('link', { name: 'Open notebook icon', exact: true }).click()
		await expect(page).toHaveURL(new URL(`${notebook.publishedUrl}/icon`, page.url()).href)
		await expect(page.locator('html')).toHaveAttribute('data-icon-transition', 'same-document')
		await expect(page.locator('.poster .poster-title')).toHaveText(notebook.title)
		await expect(page.getByRole('link', { name: 'Back to editor' })).toHaveAttribute(
			'href',
			notebook.editorUrl
		)
	} finally {
		obsoleteCSS.resolve()
	}
	await page.waitForLoadState('networkidle')
	expect(await styles(page)).toContain('.recipe-card')
	await expect(page.locator('.poster .poster-title')).toHaveText(notebook.title)
	await expect(page.locator('.recipe-card')).toHaveCount(0)
	await expect(page.locator('html')).toHaveAttribute('data-obsolete-icon', 'false')
})

test('a rejected chosen Icon stylesheet shows the import error instead of a fallback and Reload recovers', async ({
	page
}) => {
	// Playwright supplies a fresh context, so neither the module nor its CSS is cached.
	await signIn(page, fieldGuide.publishedUrl)
	const rejected: string[] = []
	page.on('requestfailed', (request) => rejected.push(request.url()))
	let blockedStylesheet: string | undefined
	await page.route('**/*.css', async (route) => {
		const response = await route.fetch()
		if ((await response.text()).includes('.recipe-card')) {
			blockedStylesheet = route.request().url()
			return route.abort('failed')
		}
		await route.fulfill({ response })
	})
	await page
		.getByRole('navigation', { name: 'Published views' })
		.getByRole('link', { name: 'Icon', exact: true })
		.click()
	await expect(page.getByRole('alert')).toHaveText('The icon preview could not be loaded.')
	expect(blockedStylesheet).toBeDefined()
	expect(rejected).toContain(blockedStylesheet)
	await expect(page.getByRole('main')).toHaveCount(1)
	await expect(page.locator('.icon-viewport, .recipe-card, .book')).toHaveCount(0)
	await expect(page.getByRole('status')).toHaveCount(0)
	await page.unroute('**/*.css')
	await page.getByRole('button', { name: 'Reload', exact: true }).click()
	await expect(page.locator('.recipe-card .card-title')).toHaveText(fieldGuide.title)
	await expect(page.getByRole('alert')).toHaveCount(0)
})

test('job-only Preview URLs remount status and derive Back, retry, published and asset destinations from the job', async ({
	page,
	appServer
}) => {
	const failed = previewUrl(appServer.previews.failed)
	const completed = previewUrl(appServer.previews.completed)
	await signIn(page, `${failed}/icon`)
	await expect(page.locator('[data-status="failed"]')).toBeVisible()
	await expect(page.getByRole('main')).toContainText(notebook.file)
	const tabs = page.getByRole('navigation', { name: 'Preview views' })
	await expect(tabs.getByRole('link', { name: 'icon', exact: true })).toHaveAttribute(
		'aria-disabled',
		'true'
	)
	await expect(page.getByRole('link', { name: 'Back to editor' })).toHaveAttribute(
		'href',
		notebook.editorUrl
	)
	expect(await styles(page)).not.toMatch(/\.recipe-card|\.book-cover/)
	const retryUrl = notebook.editorUrl.replace(/source$/, 'preview')
	await page.route(`**${retryUrl}`, (route) =>
		route.fulfill({ status: 400, json: { type: 'failure', status: 400, data: null } })
	)
	const retry = page.waitForRequest((request) => new URL(request.url()).pathname === retryUrl)
	await page.getByRole('button', { name: 'Generate fresh preview' }).click()
	expect((await retry).method()).toBe('POST')

	// A real Kit link transition keeps the document, exercising the outer job key, not a reload.
	await page.evaluate((href) => {
		document.documentElement.dataset.jobRemount = 'same-document'
		const link = document.createElement('a')
		link.href = href
		link.textContent = 'Open completed preview'
		document.body.append(link)
	}, completed)
	await page.getByRole('link', { name: 'Open completed preview', exact: true }).click()
	await expect(page.locator('html')).toHaveAttribute('data-job-remount', 'same-document')
	await expect(page.locator('[data-status="completed"]')).toBeVisible()
	await expect(page.getByRole('main')).toContainText(fieldGuide.file)
	await expect(page.getByRole('main')).not.toContainText('Recorded preview failure')
	await expect(page.getByRole('link', { name: 'View published', exact: true })).toHaveAttribute(
		'href',
		fieldGuide.publishedUrl
	)
	await expect(page.getByRole('link', { name: 'Back to editor' })).toHaveAttribute(
		'href',
		fieldGuide.editorUrl
	)
	expect(await styles(page)).not.toMatch(/\.recipe-card|\.book-cover/)
	for (const tab of ['page', 'icon', 'share']) {
		await expect(tabs.getByRole('link', { name: tab, exact: true })).toHaveAttribute(
			'href',
			`${completed}/${tab}`
		)
	}
	await tabs.getByRole('link', { name: 'page', exact: true }).click()
	await expect(
		page.getByRole('heading', { name: fieldGuide.previewTitle, exact: true })
	).toBeVisible()
	await expect(
		page.getByRole('img', { name: `Cover of ${fieldGuide.previewTitle}` })
	).toHaveAttribute('src', assetUrl(appServer.previews.completed))
	await tabs.getByRole('link', { name: 'icon', exact: true }).click()
	await expect(page.locator('.recipe-card .card-title')).toHaveText(fieldGuide.previewTitle)
	const cover = page.locator('.recipe-card img')
	await expect(cover).toHaveAttribute('src', assetUrl(appServer.previews.completed))
	await expect
		.poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth))
		.toBeGreaterThan(0)
	await expect(page.locator('main img[src*="/pieces/assets/"]')).toHaveCount(0)
})

type PreviewStreamEvent = { kind: 'open' | 'close' | 'done'; url: string }
declare global {
	interface Window {
		observePreviewStream: (event: PreviewStreamEvent) => Promise<void>
	}
}

test('live Preview streams close on job switch, resubscribe to the current job and reload on completion', async ({
	page,
	appServer
}) => {
	const pending = previewUrl(appServer.previews.pending)
	const completed = previewUrl(appServer.previews.completed)
	const stream = new URL(
		`/api/admin/preview/${appServer.previews.pending}/stream`,
		appServer.origin
	).href
	const events: PreviewStreamEvent[] = []
	await page.exposeFunction('observePreviewStream', (event: PreviewStreamEvent) =>
		events.push(event)
	)
	await page.addInitScript(() => {
		// Observe lifecycle only: native EventSource still opens the connection and delivers events.
		window.EventSource = class extends EventSource {
			constructor(url: string | URL, options?: EventSourceInit) {
				super(url, options)
				this.addEventListener(
					'open',
					() => void window.observePreviewStream({ kind: 'open', url: this.url })
				)
				this.addEventListener(
					'done',
					() => void window.observePreviewStream({ kind: 'done', url: this.url })
				)
			}
			close() {
				void window.observePreviewStream({ kind: 'close', url: this.url })
				super.close()
			}
		}
	})
	await signIn(page, pending)
	await expect(page.locator('[data-status="enqueued"]')).toBeVisible()
	await expect.poll(() => events).toEqual([{ kind: 'open', url: stream }])
	await page.evaluate(
		({ completed, pending }) => {
			document.documentElement.dataset.streamDocument = 'before-completion'
			for (const [name, href] of [
				['Open completed job', completed],
				['Return to pending job', pending]
			]) {
				const link = document.createElement('a')
				link.href = href
				link.textContent = name
				document.body.append(link)
			}
		},
		{ completed, pending }
	)
	await page.getByRole('link', { name: 'Open completed job', exact: true }).click()
	await expect(page.locator('[data-status="completed"]')).toBeVisible()
	await expect(page.locator('html')).toHaveAttribute('data-stream-document', 'before-completion')
	await expect
		.poll(() => events)
		.toEqual([
			{ kind: 'open', url: stream },
			{ kind: 'close', url: stream }
		])
	await page.getByRole('link', { name: 'Return to pending job', exact: true }).click()
	await expect(page.locator('[data-status="enqueued"]')).toBeVisible()
	await expect(page.locator('html')).toHaveAttribute('data-stream-document', 'before-completion')
	await expect
		.poll(() => events)
		.toEqual([
			{ kind: 'open', url: stream },
			{ kind: 'close', url: stream },
			{ kind: 'open', url: stream }
		])

	// Complete the real queued run via the SDK; the real SSE 'done' must cause the reload.
	await completePendingPreview(appServer.directory, appServer.previews.pending)
	await expect.poll(() => events).toContainEqual({ kind: 'done', url: stream })
	await expect(page.locator('html')).not.toHaveAttribute('data-stream-document')
	await expect(page).toHaveURL(new URL(pending, appServer.origin).href)
	await expect(page.locator('[data-status="completed"]')).toBeVisible()
	await expect(
		page.getByRole('heading', { name: fieldGuide.previewTitle, exact: true })
	).toBeVisible()
	await expect(page.getByRole('main')).toContainText(fieldGuide.file)
	await expect(
		page
			.getByRole('row')
			.filter({ has: page.getByRole('rowheader', { name: 'Type', exact: true }) })
	).toContainText(fieldGuide.type)
	await expect(page.getByRole('link', { name: 'share', exact: true })).toHaveAttribute(
		'aria-disabled',
		'false'
	)
	await expect(
		page.getByRole('link', { name: `View image.original: ${fieldGuide.previewAsset}`, exact: true })
	).toHaveAttribute('href', assetUrl(appServer.previews.pending))
})

test('the representative public book still renders with selective CSS without JavaScript', async ({
	browser,
	baseURL
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false })
	try {
		const page = await context.newPage()
		await page.goto(`${baseURL}${fieldGuide.publicUrl}`)
		await expect(page.getByRole('heading', { name: fieldGuide.title, exact: true })).toBeVisible()
		await expect(page.locator('.hero-icon .book')).toBeVisible()
		expect(await styles(page)).toContain('.book-cover')
		expect(await styles(page)).not.toContain('.recipe-card')
		expect(opengraphScopes(await styles(page))).toEqual([])
	} finally {
		await context.close()
	}
})
