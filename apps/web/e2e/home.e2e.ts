import type { Page } from '@playwright/test'
import { expect, test } from './support/test.js'
import { fieldGuide, notebook } from './support/fixture.js'

const compositions = '.piece-icon .poster, .piece-icon .recipe-card'
const homePieces = [
	notebook,
	{ title: 'Forest Notebook', publicUrl: '/pieces/notes/forest-notebook' },
	fieldGuide
]

async function expectHomeLinks(page: Page) {
	const main = page.getByRole('main')
	await expect(main.getByRole('heading', { name: 'luzzle pieces', exact: true })).toBeVisible()
	await expect(main.getByRole('heading', { name: 'latest', exact: true })).toBeVisible()
	await expect(main.getByRole('heading', { name: 'random', exact: true })).toHaveCount(0)
	for (const [name, pathname] of [
		['pieces', '/pieces'],
		[notebook.type, `/pieces/${notebook.type}`],
		[fieldGuide.type, `/pieces/${fieldGuide.type}`],
		...homePieces.map(({ title, publicUrl }) => [title, publicUrl])
	]) {
		const link = main.getByRole('link', { name, exact: true })
		await expect(link).toBeVisible()
		await expect(link).toHaveJSProperty('href', new URL(pathname, page.url()).href)
	}
	await expect(main.locator('.piece-card')).toHaveCount(3)
}

test('a fresh home response keeps titles, type links and decorative placeholders usable without JavaScript', async ({
	browser,
	baseURL
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
	try {
		const page = await context.newPage()
		const response = await page.goto('/')
		expect(response?.status()).toBe(200)
		await expectHomeLinks(page)
		await expect(page.locator('.icon-placeholder')).toHaveCount(3)
		await expect(page.locator('.icon-placeholder').first()).toBeVisible()
		await expect(page.locator('.piece-icon[aria-hidden="true"]')).toHaveCount(3)
		await expect(page.locator(compositions)).toHaveCount(0)
	} finally {
		await context.close()
	}
})
