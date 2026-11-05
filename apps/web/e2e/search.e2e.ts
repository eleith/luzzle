import { expect, test } from './support/test.js'
import { notebook } from './support/fixture.js'

test('search for a piece and open its public page', async ({ page, baseURL }) => {
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
	await results.getByRole('link', { name: notebook.title }).click()
	await expect(page).toHaveURL(`${baseURL}${notebook.publicUrl}`)
	await expect(page.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()
})
