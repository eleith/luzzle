import { expect, test } from './support/test.js'
import { notebook } from './support/fixture.js'

test('search opens the public page after its CSS is ready and reuses it on revisit', async ({
	page,
	baseURL
}) => {
	const templateLookups: string[] = []
	page.on('request', (request) => {
		const path = new URL(request.url()).pathname
		if (path.startsWith('/api/templates/') || path === '/_app/env.js') {
			templateLookups.push(request.url())
		}
	})
	await page.goto('/')
	const search = page
		.getByRole('navigation', { name: 'Global' })
		.getByLabel('search', { exact: true })
	await expect(search).toHaveAttribute('aria-haspopup', 'dialog')
	await search.click()
	const dialog = page.getByRole('dialog', { name: 'Search', exact: true })
	await dialog.getByRole('searchbox', { name: 'Search query' }).fill(notebook.title)
	await dialog.getByRole('button', { name: 'Search', exact: true }).click()
	await expect(page).toHaveURL(
		`${baseURL}/search?${new URLSearchParams({ query: notebook.title })}`
	)

	const results = page.getByRole('region', { name: 'Search results', exact: true })
	await expect(results.getByRole('link', { name: 'Forest Notebook' })).toHaveCount(0)
	const releaseStylesheets = Promise.withResolvers<void>()
	let stylesheetRequests = 0
	await page.route('**/*.css', async (route) => {
		stylesheetRequests++
		await releaseStylesheets.promise
		await route.continue()
	})

	const searchUrl = page.url()
	const navigation = results.getByRole('link', { name: notebook.title }).click()
	try {
		await expect.poll(() => stylesheetRequests).toBeGreaterThan(0)
		// Hold CSS long enough to catch a premature route commit, not just request initiation.
		await page.waitForTimeout(500)
		await expect(page).toHaveURL(searchUrl)
		await expect(page.getByRole('heading', { name: notebook.title, exact: true })).not.toBeVisible()
	} finally {
		releaseStylesheets.resolve()
	}
	await navigation
	await expect(page).toHaveURL(`${baseURL}${notebook.publicUrl}`)
	await expect(page.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()

	const firstVisitRequests = stylesheetRequests
	await page.goBack()
	await expect(page).toHaveURL(searchUrl)
	await results.getByRole('link', { name: notebook.title }).click()
	await expect(page).toHaveURL(`${baseURL}${notebook.publicUrl}`)
	await expect(page.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()
	expect(stylesheetRequests).toBe(firstVisitRequests)
	expect(templateLookups).toEqual([])
})

test('a server-rendered error page can navigate to a piece without a lookup or document reload', async ({
	page,
	baseURL
}) => {
	const templateLookups: string[] = []
	page.on('request', (request) => {
		const path = new URL(request.url()).pathname
		if (path.startsWith('/api/templates/') || path === '/_app/env.js') {
			templateLookups.push(request.url())
		}
	})
	const response = await page.goto('/missing-routing-example')
	expect(response?.status()).toBe(404)
	await expect(
		page.getByRole('navigation', { name: 'Global' }).getByLabel('search', { exact: true })
	).toHaveAttribute('aria-haspopup', 'dialog')
	// Supply a destination link on the error page to exercise routing directly from that state.
	await page.evaluate((href) => {
		document.documentElement.dataset.routingProof = 'same-document'
		const link = document.createElement('a')
		link.href = href
		link.textContent = 'Open the notebook'
		document.body.append(link)
	}, notebook.publicUrl)
	await page.getByRole('link', { name: 'Open the notebook', exact: true }).click()
	await expect(page).toHaveURL(`${baseURL}${notebook.publicUrl}`)
	await expect(page.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()
	await expect(page.locator('html')).toHaveAttribute('data-routing-proof', 'same-document')
	expect(templateLookups).toEqual([])
})
