import { expect, test } from './support/test.js'
import { fieldGuide, notebook } from './support/fixture.js'

test('search filters results and opens a public piece with working history', async ({
	page,
	baseURL
}) => {
	await page.goto('/')
	const search = page
		.getByRole('navigation', { name: 'Global' })
		.getByLabel('search', { exact: true })
	await expect(search).toHaveAttribute('aria-haspopup', 'dialog')
	await search.click()
	const dialog = page.getByRole('dialog', { name: 'Search', exact: true })
	// All three fixture pieces share this text, but select different icon templates.
	const query = 'Original observation'
	await dialog.getByRole('searchbox', { name: 'Search query' }).fill(query)
	await dialog.getByRole('button', { name: 'Search', exact: true }).click()
	await expect(page).toHaveURL(`${baseURL}/search?${new URLSearchParams({ query })}`)

	const results = page.getByRole('region', { name: 'Search results', exact: true })
	const notebookLink = results.getByRole('link', { name: notebook.title, exact: true })
	const guideLink = results.getByRole('link', { name: fieldGuide.title, exact: true })
	await expect(notebookLink.locator('.piece-icon[aria-hidden="true"] .poster-title')).toHaveText(
		notebook.title
	)
	await expect(
		guideLink.locator('.piece-icon[aria-hidden="true"] .recipe-card .card-title')
	).toHaveText(fieldGuide.title)
	await expect(notebookLink.locator('.icon-placeholder')).toHaveCount(0)
	await expect(guideLink.locator('.icon-placeholder')).toHaveCount(0)

	await search.click()
	await dialog.getByRole('button', { name: 'Piece Type', exact: true }).click()
	await page.getByRole('option', { name: fieldGuide.type, exact: true }).click()
	await dialog.getByRole('button', { name: 'Search', exact: true }).click()
	await expect(page).toHaveURL(
		`${baseURL}/search?${new URLSearchParams({ query, type: fieldGuide.type })}`
	)
	await expect(notebookLink).toHaveCount(0)
	await expect(
		guideLink.locator('.piece-icon[aria-hidden="true"] .recipe-card .card-title')
	).toHaveText(fieldGuide.title)
	await expect(guideLink.locator('.icon-placeholder')).toHaveCount(0)

	await search.click()
	await dialog.getByRole('button', { name: 'Clear Filters', exact: true }).click()
	await dialog.getByRole('searchbox', { name: 'Search query' }).fill(notebook.title)
	await dialog.getByRole('button', { name: 'Search', exact: true }).click()
	await expect(page).toHaveURL(
		`${baseURL}/search?${new URLSearchParams({ query: notebook.title })}`
	)
	await expect(results.getByRole('link', { name: 'Forest Notebook' })).toHaveCount(0)
	const searchUrl = page.url()
	await results.getByRole('link', { name: notebook.title }).click()
	await expect(page).toHaveURL(`${baseURL}${notebook.publicUrl}`)
	await expect(page.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()

	await page.goBack()
	await expect(page).toHaveURL(searchUrl)
	await results.getByRole('link', { name: notebook.title }).click()
	await expect(page).toHaveURL(`${baseURL}${notebook.publicUrl}`)
	await expect(page.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()
})

test('search stays usable without JavaScript, including mixed and typed result placeholders', async ({
	browser,
	baseURL
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
	try {
		const page = await context.newPage()
		const response = await page.goto('/search')
		expect(response?.status()).toBe(200)
		const main = page.getByRole('main')
		await expect(main.getByRole('heading', { name: 'Search', exact: true })).toBeVisible()
		const form = main.locator('form')
		await expect(form.getByRole('searchbox', { name: 'Search query' })).toHaveValue('')

		// The native form must still reach a useful empty-result response.
		const missingQuery = 'unfindable-e2e-search'
		await form.getByRole('searchbox', { name: 'Search query' }).fill(missingQuery)
		await form.getByRole('button', { name: 'Search', exact: true }).click()
		await expect(main.getByRole('heading', { name: 'No results found', exact: true })).toBeVisible()
		await expect(main).toContainText(`"${missingQuery}"`)
		await expect(main.locator('.piece-card')).toHaveCount(0)
		await expect(main.getByRole('link', { name: 'more', exact: true })).toHaveCount(0)
		await page
			.getByRole('navigation', { name: 'Global' })
			.getByRole('link', { name: 'search', exact: true })
			.click()
		await expect(form.getByRole('searchbox', { name: 'Search query' })).toHaveValue('')

		const filters = { after: '2024-01-01', before: '2024-12-31' }
		await page.goto(`/search?${new URLSearchParams(filters)}`)
		const results = page.getByRole('region', { name: 'Search results', exact: true })
		await expect(results).toContainText(`between ${filters.after} and ${filters.before}`)
		for (const piece of [
			notebook,
			{ title: 'Forest Notebook', publicUrl: '/pieces/notes/forest-notebook' },
			fieldGuide
		]) {
			const link = results.getByRole('link', { name: piece.title, exact: true })
			await expect(link).toBeVisible()
			await expect(link).toHaveJSProperty('href', new URL(piece.publicUrl, page.url()).href)
			await expect(link.locator('.piece-icon')).toHaveAttribute('aria-hidden', 'true')
			await expect(link.locator('.icon-placeholder')).toBeVisible()
		}
		await expect(results.locator('.poster, .recipe-card')).toHaveCount(0)
		await expect(main.getByRole('link', { name: 'more', exact: true })).toHaveCount(0)

		// A typed search is lazy too; only its text and link are needed to open the piece.
		await page.goto(`/search?${new URLSearchParams({ ...filters, type: fieldGuide.type })}`)
		await expect(results).toContainText(`in ${fieldGuide.type}`)
		await expect(results.getByRole('link', { name: notebook.title, exact: true })).toHaveCount(0)
		const guideLink = results.getByRole('link', { name: fieldGuide.title, exact: true })
		await expect(guideLink).toHaveJSProperty('href', new URL(fieldGuide.publicUrl, page.url()).href)
		await expect(guideLink.locator('.piece-icon')).toHaveAttribute('aria-hidden', 'true')
		await expect(guideLink.locator('.icon-placeholder')).toBeVisible()
		await expect(results.locator('.poster, .recipe-card')).toHaveCount(0)
		await guideLink.click()
		await expect(page).toHaveURL(`${baseURL}${fieldGuide.publicUrl}`)
		await expect(page.getByRole('heading', { name: fieldGuide.title, exact: true })).toBeVisible()
	} finally {
		await context.close()
	}
})

test('a server-rendered error page can navigate to a piece without a document reload', async ({
	page,
	baseURL
}) => {
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
})
