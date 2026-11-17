import type { Cookie, Page } from '@playwright/test'
import { expect, test } from './support/test.js'
import { ADMIN, completePendingPreview, fieldGuide, notebook } from './support/fixture.js'

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
	await expect(previewRegion).not.toContainText('Ada Reader')
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
	const png = await page.request.get(shareAssetUrl(appServer.previews.completed))
	expect(png.status()).toBe(200)
	expect(png.headers()['content-type']).toBe('image/png')
	expect(png.headers()['cache-control']).toBe('private, no-store')
	expect((await png.body()).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
	const data = await page.request.get(`${preview}/share/__data.json`)
	expect(data.headers()['cache-control']).toBe('private, no-store')
	expect(await data.text()).toContain(fieldGuide.previewTitle)
})

test('public content works without JavaScript while admin Page and Icon previews are client-only', async ({
	page,
	browser
}) => {
	await signIn(page, fieldGuide.publishedUrl)
	const noScript = await browser.newContext({
		javaScriptEnabled: false,
		storageState: await page.context().storageState()
	})
	try {
		const shell = await noScript.newPage()
		await shell.goto(new URL(fieldGuide.publicUrl, page.url()).href)
		await expect(shell.getByRole('heading', { name: fieldGuide.title, exact: true })).toBeVisible()
		await expect(shell.getByRole('main')).toContainText('by Ada Reader')
		await expect(shell.getByRole('main')).toContainText('Original observation.')
		for (const tab of ['page', 'icon']) {
			const response = await shell.goto(
				new URL(`${fieldGuide.publishedUrl}/${tab}`, page.url()).href
			)
			expect(response?.headers()['cache-control']).toBe('private, no-store')
			await expect(shell.getByRole('navigation', { name: 'Published views' })).toBeVisible()
			await expect(shell.locator('noscript p')).toHaveText(
				`JavaScript is required to display the ${tab} preview.`
			)
			await expect(shell.locator('noscript p')).toBeVisible()
			await expect(shell.locator('.book, .recipe-card')).toHaveCount(0)
		}
	} finally {
		await noScript.close()
	}

	const tabs = page.getByRole('navigation', { name: 'Published views' })
	await tabs.getByRole('link', { name: 'Page', exact: true }).click()
	await expect(page.getByRole('heading', { name: fieldGuide.title, exact: true })).toBeVisible()
	await expect(page.getByRole('main')).toContainText('by Ada Reader')
	await expect(page.getByRole('main')).not.toContainText('Olivia Sharer')
	await tabs.getByRole('link', { name: 'Icon', exact: true }).click()
	await expect(page.locator('.recipe-card .card-title')).toHaveText(fieldGuide.title)
	await expect(tabs.getByRole('link', { name: 'Icon', exact: true })).toHaveAttribute(
		'aria-current',
		'page'
	)
	await expect(page.getByRole('link', { name: 'Back to editor' })).toHaveAttribute(
		'href',
		fieldGuide.editorUrl
	)
})

test('a pending Icon import cannot replace the new template on a same-route piece transition', async ({
	page
}) => {
	await signIn(page, fieldGuide.publishedUrl)
	const obsoleteModule = Promise.withResolvers<void>()
	let held = false
	await page.route('**/*.js', async (route) => {
		const response = await route.fetch()
		// The recipe-card renderer's markup is distinct from other production JS chunks.
		const module = await response.text()
		if (module.includes('ingredients-grid') && module.includes('card-cutouts')) {
			held = true
			await obsoleteModule.promise
		}
		await route.fulfill({ response })
	})
	try {
		await page.getByRole('link', { name: 'Icon', exact: true }).click()
		await expect.poll(() => held).toBe(true)
		await expect(page.getByRole('status')).toMatchAriaSnapshot('- status: Loading icon preview…')
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
		obsoleteModule.resolve()
	}
	await page.waitForLoadState('networkidle')
	await expect(page.locator('.poster .poster-title')).toHaveText(notebook.title)
	await expect(page.locator('.recipe-card')).toHaveCount(0)
	await expect(page.locator('html')).toHaveAttribute('data-obsolete-icon', 'false')
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
	await expect(page.getByRole('main')).toContainText('by Ada Reader')
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
