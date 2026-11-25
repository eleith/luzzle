import type { Page } from '@playwright/test'
import { expect, test } from './support/test.js'
import { fieldGuide, notebook } from './support/fixture.js'

const forestNotebook = { title: 'Forest Notebook', publicUrl: '/pieces/notes/forest-notebook' }
const homePieces = [notebook, forestNotebook, fieldGuide]

function homeCard(page: Page, title: string) {
	return page
		.locator('.piece-card')
		.filter({ has: page.getByRole('link', { name: title, exact: true }) })
}

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

test('without JavaScript home renders external icons and a linked fallback at 80px', async ({
	browser,
	baseURL
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
	try {
		const page = await context.newPage()
		const response = await page.goto('/')
		expect(response?.status()).toBe(200)
		await expectHomeLinks(page)
		for (const { title } of [notebook, forestNotebook]) {
			const card = homeCard(page, title)
			const icon = card.locator('.piece-icon[inert][aria-hidden="true"] .fixture-note-icon')
			await expect(icon).toBeVisible()
			await expect(icon).toHaveText(title)
			await expect(icon).toHaveAttribute('data-width', '80')
			await expect(card.locator('.poster')).toHaveCount(0)
			await expect(card.getByRole('link')).toHaveCount(1)
		}
		const styles = page.locator("xpath=//head/style[contains(., '--fixture-note-active')]")
		await expect(styles).toHaveCount(1)
		const guide = homeCard(page, fieldGuide.title)
		const fallback = guide.locator('.piece-icon[inert][aria-hidden="true"] .poster')
		await expect(fallback).toHaveText(fieldGuide.title)
		await expect(fallback).toHaveCSS('width', '80px')
		await guide.getByRole('link', { name: fieldGuide.title, exact: true }).click()
		await expect(page).toHaveURL(`${baseURL}${fieldGuide.publicUrl}`)
	} finally {
		await context.close()
	}
})

test('after hydration the home card links through its external icon', async ({ page, baseURL }) => {
	await page.goto('/')
	await expect(homeCard(page, fieldGuide.title).locator('.poster .poster-title')).toHaveText(
		fieldGuide.title
	)
	const icon = homeCard(page, notebook.title).locator('.fixture-note-icon')
	await expect(icon).toHaveCSS('--fixture-note-active', 'no')
	const titleLink = homeCard(page, notebook.title).getByRole('link', { name: notebook.title })
	await titleLink.focus()
	await page.keyboard.press('Tab')
	await page.keyboard.press('Shift+Tab')
	await expect(titleLink).toBeFocused()
	await expect(icon).toHaveCSS('--fixture-note-active', 'yes')
	await page.keyboard.press('Tab')
	await expect(icon).toHaveCSS('--fixture-note-active', 'no')
	// Hit the decoration, not the title; the template's own link must not win.
	await icon.scrollIntoViewIfNeeded()
	const box = (await icon.boundingBox())!
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
	await expect(icon).toHaveCSS('--fixture-note-active', 'yes')
	await page.mouse.down()
	await page.mouse.up()
	await expect(page).toHaveURL(`${baseURL}${notebook.publicUrl}`)
})
