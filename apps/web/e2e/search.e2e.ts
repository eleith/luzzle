import { expect, test } from './support/test.js'
import { notebook } from './support/fixture.js'

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
	await dialog.getByRole('searchbox', { name: 'Search query' }).fill(notebook.title)
	await dialog.getByRole('button', { name: 'Search', exact: true }).click()
	await expect(page).toHaveURL(
		`${baseURL}/search?${new URLSearchParams({ query: notebook.title })}`
	)

	const results = page.getByRole('region', { name: 'Search results', exact: true })
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
