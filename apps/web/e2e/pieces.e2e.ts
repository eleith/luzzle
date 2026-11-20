import type { Page } from '@playwright/test'
import { expect, test } from './support/test.js'
import { fieldGuide, notebook } from './support/fixture.js'

const compositions = '.piece-icon .poster, .piece-icon .recipe-card'

async function expectListingLinks(page: Page) {
	for (const piece of [notebook, fieldGuide]) {
		const link = page.getByRole('main').getByRole('link', { name: piece.title, exact: true })
		await expect(link).toBeVisible()
		await expect(link).toHaveJSProperty('href', new URL(piece.publicUrl, page.url()).href)
	}
	await expect(page.locator('.piece-card')).toHaveCount(3)
}

test('without JavaScript the root keeps usable placeholders while typed listings render only their configured icon', async ({
	browser,
	baseURL
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
	try {
		const page = await context.newPage()
		const root = await page.goto('/pieces')
		expect(root?.status()).toBe(200)
		await expect(page.getByRole('heading', { name: 'Pieces', exact: true })).toHaveCount(1)
		await expectListingLinks(page)
		await expect(page.locator(compositions)).toHaveCount(0)
		await expect(page.locator('.icon-placeholder')).toHaveCount(3)

		const typedPath = `/pieces/${fieldGuide.type}?year=2024&page=1`
		const typed = await page.goto(typedPath)
		expect(typed?.status()).toBe(200)
		await expect(page).toHaveURL(new URL(typedPath, baseURL!).href)
		await expect(page.getByRole('heading', { name: fieldGuide.type, exact: true })).toHaveCount(1)
		await expect(page.locator('.piece-card')).toHaveCount(1)
		await expect(page.getByRole('link', { name: fieldGuide.title, exact: true })).toHaveJSProperty(
			'href',
			new URL(fieldGuide.publicUrl, page.url()).href
		)
		await expect(page.locator('.piece-icon .recipe-card .card-title')).toHaveText(fieldGuide.title)
		await expect(page.locator('.icon-placeholder')).toHaveCount(0)
	} finally {
		await context.close()
	}
})

test('tapping a superscript opens the full sheet even on a wide touch screen', async ({
	browser,
	baseURL
}) => {
	const context = await browser.newContext({
		baseURL,
		hasTouch: true,
		isMobile: true,
		javaScriptEnabled: false,
		reducedMotion: 'reduce',
		viewport: { width: 1366, height: 1024 }
	})
	try {
		const page = await context.newPage()
		await page.goto(notebook.publicUrl)

		const reference = page.getByRole('button', { name: 'Sidenote 1', exact: true })
		const note = page.getByRole('note', { name: 'Sidenote 1' })
		await reference.tap()
		await expect(note.getByText('Sidenote 1', { exact: true })).toBeVisible()
		await expect(note.getByRole('link', { name: 'Later source' })).toBeVisible()
		await note.getByRole('button', { name: 'Close sidenote 1' }).tap()
		await expect(note).toBeHidden()
	} finally {
		await context.close()
	}
})

test('desktop sidenotes link to the margin and expand in place without JavaScript', async ({
	browser,
	baseURL
}) => {
	const context = await browser.newContext({
		baseURL,
		javaScriptEnabled: false,
		viewport: { width: 1440, height: 900 }
	})
	try {
		const page = await context.newPage()
		await page.goto(notebook.publicUrl)

		const note = page.getByRole('note', { name: 'Sidenote 1' })
		const early = note.getByRole('link', { name: 'Early source' })
		const later = note.getByRole('link', { name: 'Later source' })
		const disclosure = note.locator('summary')
		const reference = page.getByRole('link', { name: 'Locate sidenote 1' })
		const targetedNote = note.and(page.locator(':target'))

		// Locate and expand a sidenote deep in an essay.
		await page.getByRole('main').evaluate((main) => {
			main.style.marginBlockStart = '300vh'
		})
		await early.click()
		await expect(page).toHaveURL(/#observation$/)
		await reference.press('Enter')
		await expect(page).toHaveURL(/#sidenote-1$/)
		await expect(targetedNote).toBeInViewport()
		await expect(page.locator(':popover-open')).toHaveCount(0)
		await expect(note.getByText('Sidenote 1', { exact: true })).toBeHidden()

		await page.keyboard.press('Tab')
		await expect(early).toBeFocused()
		await page.keyboard.press('Tab')
		await expect(disclosure).toBeFocused()
		await page.keyboard.press('Enter')
		await page.keyboard.press('Tab')
		await expect(later).toBeFocused()

		await disclosure.click()
		await expect(later).toBeHidden()
		await expect(early).toBeInViewport()
		await expect(targetedNote).toBeVisible()

		await early.click()
		await expect(page).toHaveURL(/#observation$/)
		await expect(targetedNote).toHaveCount(0)
	} finally {
		await context.close()
	}
})

test('client navigation refreshes listing and page layout data without reloading', async ({
	page,
	baseURL
}) => {
	// These destinations have no UI links; native anchors still exercise SvelteKit navigation.
	async function clickInjectedNavigationLink(path: string) {
		await page.evaluate((href) => {
			document.getElementById('injected-client-navigation-link')?.remove()
			const link = document.createElement('a')
			link.id = 'injected-client-navigation-link'
			link.textContent = 'Injected client navigation link'
			link.href = href
			document.body.append(link)
		}, path)
		await page.getByRole('link', { name: 'Injected client navigation link', exact: true }).click()
	}

	await page.goto('/')
	// Wait for hydration before following the real type link.
	await expect(
		page.getByRole('navigation', { name: 'Global' }).getByLabel('search', { exact: true })
	).toHaveAttribute('aria-haspopup', 'dialog')
	await page.evaluate(() => {
		document.documentElement.dataset.listingNavigation = 'same-document'
		localStorage.setItem('luzzle.admin', 'true')
	})
	const editSource = page.getByRole('link', { name: 'edit source', exact: true })
	await expect(editSource).toHaveCount(0)
	await page.getByRole('main').getByRole('link', { name: fieldGuide.type, exact: true }).click()
	await expect(page).toHaveURL(`${baseURL}/pieces/${fieldGuide.type}`)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')
	await expect(page.locator('.piece-card')).toHaveCount(1)
	await expect(page.locator('.piece-icon .recipe-card .card-title')).toHaveText(fieldGuide.title)
	await expect(editSource).toHaveCount(0)
	await expect(page.getByRole('link', { name: fieldGuide.title, exact: true })).toBeVisible()
	await expect(page.locator('.icon-placeholder')).toHaveCount(0)

	await clickInjectedNavigationLink('/pieces/notes')
	await expect(page).toHaveURL(`${baseURL}/pieces/notes`)
	await expect(page.getByRole('heading', { name: 'notes', exact: true })).toBeVisible()
	await expect(page.locator('.piece-card')).toHaveCount(2)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')

	await clickInjectedNavigationLink('/pieces/notes?year=2023&page=1')
	await expect(page).toHaveURL(`${baseURL}/pieces/notes?year=2023&page=1`)
	await expect(page.locator('.piece-card')).toHaveCount(0)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')

	await clickInjectedNavigationLink('/pieces/notes?year=2024&page=1')
	await expect(page).toHaveURL(`${baseURL}/pieces/notes?year=2024&page=1`)
	await expect(page.locator('.piece-card')).toHaveCount(2)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')

	// An empty later page redirects to the canonical typed listing.
	await clickInjectedNavigationLink('/pieces/notes?year=2024&page=2')
	await expect(page).toHaveURL(`${baseURL}/pieces/notes`)
	await expect(page.locator('.piece-card')).toHaveCount(2)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')

	await page.getByRole('main').getByRole('link', { name: notebook.title, exact: true }).click()
	await expect(page).toHaveURL(`${baseURL}${notebook.publicUrl}`)
	await expect(page.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()
	await expect(page).toHaveTitle(`${notebook.title} | E2E Garden`)
	await expect(editSource).toHaveJSProperty('href', `${baseURL}/admin/open/notes/meteor-notebook`)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')

	// The same page template must refresh when only the slug changes.
	await clickInjectedNavigationLink('/pieces/notes/forest-notebook')
	await expect(page).toHaveURL(`${baseURL}/pieces/notes/forest-notebook`)
	await expect(page.getByRole('heading', { name: 'Forest Notebook', exact: true })).toBeVisible()
	await expect(page).toHaveTitle('Forest Notebook | E2E Garden')
	await expect(editSource).toHaveJSProperty('href', `${baseURL}/admin/open/notes/forest-notebook`)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')

	await clickInjectedNavigationLink(fieldGuide.publicUrl)
	await expect(page).toHaveURL(`${baseURL}${fieldGuide.publicUrl}`)
	await expect(page.getByRole('heading', { name: fieldGuide.title, exact: true })).toBeVisible()
	await expect(page).toHaveTitle(`${fieldGuide.title} | E2E Garden`)
	await expect(editSource).toHaveJSProperty('href', `${baseURL}/admin/open/records/field-guide`)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')

	await clickInjectedNavigationLink('/pieces/notes/missing')
	await expect(page).toHaveURL(`${baseURL}/pieces/notes/missing`)
	await expect(editSource).toHaveCount(0)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')
})
