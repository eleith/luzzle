import type { Page } from '@playwright/test'
import { expect, test } from './support/test.js'
import { fieldGuide, notebook } from './support/fixture.js'

const forestNotebook = { title: 'Forest Notebook', publicUrl: '/pieces/notes/forest-notebook' }

function resultCard(page: Page, title: string) {
	return page.getByRole('region', { name: 'Search results', exact: true }).locator('.piece-card', {
		has: page.getByRole('link', { name: title, exact: true })
	})
}

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
	// This query matches both the file-backed notes icon and the built-in records icon.
	const query = 'Original observation'
	await dialog.getByRole('searchbox', { name: 'Search query' }).fill(query)
	await dialog.getByRole('button', { name: 'Search', exact: true }).click()
	await expect(page).toHaveURL(`${baseURL}/search?${new URLSearchParams({ query })}`)

	const results = page.getByRole('region', { name: 'Search results', exact: true })
	const notebookLink = results.getByRole('link', { name: notebook.title, exact: true })
	const guideLink = results.getByRole('link', { name: fieldGuide.title, exact: true })
	const notebookIcon = resultCard(page, notebook.title).locator('.fixture-note-icon')
	await expect(notebookIcon).toHaveText(notebook.title)
	const guideIcon = resultCard(page, fieldGuide.title).locator('.recipe-card')
	await expect(guideIcon.locator('.card-title')).toHaveText(fieldGuide.title)
	await guideLink.hover()
	await expect(guideIcon).toHaveClass(/\bactive\b/)
	await notebookLink.hover()
	await expect(guideIcon).not.toHaveClass(/\bactive\b/)

	await search.click()
	await dialog.getByRole('button', { name: 'Piece Type', exact: true }).click()
	await page.getByRole('option', { name: notebook.type, exact: true }).click()
	await dialog.getByRole('button', { name: 'Search', exact: true }).click()
	await expect(page).toHaveURL(
		`${baseURL}/search?${new URLSearchParams({ query, type: notebook.type })}`
	)
	await expect(results).toContainText(`in ${notebook.type}`)
	await expect(guideLink).toHaveCount(0)
	await notebookLink.hover()
	await expect(notebookIcon).toHaveCSS('--fixture-note-active', 'yes')

	await search.click()
	await dialog.getByRole('button', { name: 'Clear Filters', exact: true }).click()
	await dialog.getByRole('searchbox', { name: 'Search query' }).fill(notebook.title)
	await dialog.getByRole('button', { name: 'Search', exact: true }).click()
	await expect(page).toHaveURL(
		`${baseURL}/search?${new URLSearchParams({ query: notebook.title })}`
	)
	await expect(results.getByRole('link', { name: forestNotebook.title })).toHaveCount(0)
	const searchUrl = page.url()
	await notebookLink.click()
	await expect(page).toHaveURL(`${baseURL}${notebook.publicUrl}`)
	await expect(page.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()

	await page.goBack()
	await expect(page).toHaveURL(searchUrl)
	await notebookLink.click()
	await expect(page).toHaveURL(`${baseURL}${notebook.publicUrl}`)
	await expect(page.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()
})

test('search without JavaScript keeps external icons and fallback results linked', async ({
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
		for (const piece of [notebook, forestNotebook, fieldGuide]) {
			const link = results.getByRole('link', { name: piece.title, exact: true })
			await expect(link).toBeVisible()
			await expect(link).toHaveJSProperty('href', new URL(piece.publicUrl, page.url()).href)
		}
		// Both notes render their file-backed icon on the server; the built-in guide icon needs JS.
		for (const { title } of [notebook, forestNotebook]) {
			const icon = resultCard(page, title).locator('.piece-icon[inert] .fixture-note-icon')
			await expect(icon).toHaveText(title)
		}
		await expect(resultCard(page, fieldGuide.title).locator('.icon-placeholder')).toBeVisible()
		await expect(main.getByRole('link', { name: 'more', exact: true })).toHaveCount(0)

		await results.getByRole('link', { name: notebook.title, exact: true }).click()
		await expect(page).toHaveURL(`${baseURL}${notebook.publicUrl}`)
		await expect(page.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()
	} finally {
		await context.close()
	}
})

test('an unconfigured public piece URL can navigate to a configured piece without a document reload', async ({
	page,
	baseURL
}) => {
	const response = await page.goto('/pieces/unconfigured-kind/missing')
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
