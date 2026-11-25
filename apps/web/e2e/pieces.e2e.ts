import type { Page } from '@playwright/test'
import { expect, test } from './support/test.js'
import { fieldGuide, fieldNotesTag, notebook, notePageFile } from './support/fixture.js'

const notePageStyle = "xpath=//head/style[contains(., '--fixture-page-style')]"
const noteIconStyle = "xpath=//head/style[contains(., '--fixture-note-active')]"

async function expectListingLinks(page: Page) {
	for (const piece of [
		notebook,
		{ title: 'Forest Notebook', publicUrl: '/pieces/notes/forest-notebook' },
		fieldGuide
	]) {
		const link = page.getByRole('main').getByRole('link', { name: piece.title, exact: true })
		await expect(link).toBeVisible()
		await expect(link).toHaveJSProperty('href', new URL(piece.publicUrl, page.url()).href)
	}
	await expect(page.locator('.piece-card')).toHaveCount(3)
}

test('without JavaScript the mixed listing renders external icons beside a linked fallback', async ({
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
		for (const title of [notebook.title, 'Forest Notebook']) {
			const card = page
				.locator('.piece-card')
				.filter({ has: page.getByRole('link', { name: title, exact: true }) })
			await expect(card.locator('.piece-icon[inert] .fixture-note-icon')).toHaveText(title)
		}
		await expect(page.locator(noteIconStyle)).toHaveCount(1)
		const guideCard = page.locator('.piece-card').filter({ hasText: fieldGuide.title })
		await expect(guideCard.locator('.poster-title')).toHaveText(fieldGuide.title)
		await guideCard.getByRole('link', { name: fieldGuide.title, exact: true }).click()
		await expect(page).toHaveURL(new URL(fieldGuide.publicUrl, baseURL!).href)
	} finally {
		await context.close()
	}
})

test('without JavaScript typed listings render generic and authored icons', async ({
	browser,
	baseURL
}) => {
	const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
	try {
		const page = await context.newPage()
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
		await expect(page.locator('.piece-icon .poster .poster-title')).toHaveText(fieldGuide.title)

		await page.goto('/pieces/notes')
		await expect(page.locator('.fixture-note-icon')).toHaveCount(2)
		await expect(page.locator('.fixture-note-icon').first()).toHaveCSS(
			'--fixture-note-active',
			'no'
		)
		await expect(page.locator(noteIconStyle)).toHaveCount(1)
		const card = page.locator('.piece-card').filter({ hasText: notebook.title })
		await expect(card.getByRole('link')).toHaveCount(1)
		await card.getByRole('link', { name: notebook.title, exact: true }).click()
		await expect(page).toHaveURL(new URL(notebook.publicUrl, baseURL!).href)
	} finally {
		await context.close()
	}
})

for (const listing of ['/pieces', '/pieces/notes']) {
	test(`a direct ${listing} visit hydrates without replacing the parsed external icon`, async ({
		page,
		baseURL
	}) => {
		const errors: string[] = []
		page.on('pageerror', (error) => errors.push(error.message))
		page.on('console', (message) => {
			if (/hydration/i.test(message.text())) errors.push(message.text())
		})

		// Hold the client modules so we can identify the server-rendered DOM before hydration.
		const modules = Promise.withResolvers<void>()
		await page.route('**/_app/immutable/**/*.js', async (route) => {
			await modules.promise
			await route.continue()
		})
		await page.goto(listing, { waitUntil: 'commit' })
		const card = page.locator('.piece-card').filter({ hasText: notebook.title })
		const title = card.getByRole('link', { name: notebook.title, exact: true })
		const icon = card.locator('.piece-icon[inert] .fixture-note-icon')
		try {
			await icon.evaluate((node) => node.setAttribute('data-parsed-icon', 'yes'))
		} finally {
			modules.resolve()
		}
		await expect(card.getByRole('link')).toHaveCount(1)
		await expect(title.locator('.fixture-note-icon')).toHaveCount(0)
		await expect(icon).toHaveAttribute('href', '/decorative')
		await expect(
			page.getByRole('navigation', { name: 'Global' }).getByLabel('search', { exact: true })
		).toHaveAttribute('aria-haspopup', 'dialog')

		await expect(icon).toHaveAttribute('data-parsed-icon', 'yes')
		await expect(page.locator(noteIconStyle)).toHaveCount(1)
		if (listing === '/pieces')
			await expect(page.locator('.piece-icon .poster .poster-title')).toHaveText(fieldGuide.title)

		// The title's hit area extends over the inert decoration, not just its text.
		const box = (await icon.boundingBox())!
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
		await expect(icon).toHaveCSS('--fixture-note-active', 'yes')
		await page.mouse.down()
		await page.mouse.up()
		await expect(page).toHaveURL(new URL(notebook.publicUrl, baseURL!).href)
		expect(errors).toEqual([])
	})
}

test('the external page renders styled content and native sidenotes without JavaScript', async ({
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
		const response = await page.goto(notebook.publicUrl)
		expect(response?.status()).toBe(200)
		const article = page.getByRole('main').locator('.fixture-note-page')
		await expect(article.getByRole('heading', { name: notebook.title })).toBeVisible()
		await expect(article.getByText(notebook.caption, { exact: true })).toBeVisible()
		await expect(article.getByRole('img', { name: 'Notebook cover' })).toHaveAttribute(
			'src',
			/published%20meteor\.png$/
		)
		await expect(article.getByRole('link', { name: fieldNotesTag.label })).toHaveAttribute(
			'href',
			`/tags/${fieldNotesTag.slug}`
		)
		await expect(article).toHaveCSS('--fixture-page-style', 'applied')
		const nav = page.getByRole('navigation', { name: 'Global' })
		await expect(nav.getByRole('link', { name: 'random' })).toHaveJSProperty(
			'href',
			`${baseURL}/random`
		)
		expect(await response!.text()).not.toContain(notePageFile)
		const data = await page.request.get(`${notebook.publicUrl}/__data.json`)
		expect(data.status()).toBe(200)
		const body = await data.text()
		expect(body).toContain('fixture-note-page')
		expect(body).not.toContain(notePageFile)

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

	await page.goto(notebook.publicUrl)
	await expect(page.locator('.fixture-note-page')).toContainText(notebook.caption)
	const search = page
		.getByRole('navigation', { name: 'Global' })
		.getByLabel('search', { exact: true })
	await expect(search).toHaveAttribute('aria-haspopup', 'dialog')
	await search.click()
	await expect(page.getByRole('dialog', { name: 'Search', exact: true })).toBeVisible()
	await page.keyboard.press('Escape')
	await page.evaluate(() => {
		document.documentElement.dataset.listingNavigation = 'same-document'
		localStorage.setItem('luzzle.admin', 'true')
	})
	await page
		.getByRole('navigation', { name: 'Global' })
		.getByRole('link', { name: 'main page', exact: true })
		.click()
	await expect(page).toHaveURL(`${baseURL}/`)
	const editSource = page.getByRole('link', { name: 'edit source', exact: true })
	await expect(editSource).toHaveCount(0)
	await page.getByRole('main').getByRole('link', { name: fieldGuide.type, exact: true }).click()
	await expect(page).toHaveURL(`${baseURL}/pieces/${fieldGuide.type}`)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')
	await expect(page.locator('.piece-card')).toHaveCount(1)
	await expect(page.locator('.piece-icon .poster .poster-title')).toHaveText(fieldGuide.title)
	await expect(editSource).toHaveCount(0)
	await expect(page.getByRole('link', { name: fieldGuide.title, exact: true })).toBeVisible()

	await clickInjectedNavigationLink('/pieces')
	await expect(page).toHaveURL(`${baseURL}/pieces`)
	await expectListingLinks(page)
	await expect(page.locator('.fixture-note-icon')).toHaveCount(2)
	await expect(page.locator(noteIconStyle)).toHaveCount(1)
	await expect(page.locator('.piece-icon .poster .poster-title')).toHaveText(fieldGuide.title)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')

	await clickInjectedNavigationLink('/pieces/notes')
	await expect(page).toHaveURL(`${baseURL}/pieces/notes`)
	await expect(page.getByRole('heading', { name: 'notes', exact: true })).toBeVisible()
	await expect(page.locator('.piece-card')).toHaveCount(2)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')

	const externalStyles = page.locator(noteIconStyle)
	const notebookLink = page.getByRole('link', { name: notebook.title, exact: true })
	const noteIcon = page
		.locator('.piece-card')
		.filter({ has: notebookLink })
		.locator('.fixture-note-icon')
	await expect(externalStyles).toHaveCount(1)
	await expect(noteIcon).toHaveCSS('--fixture-note-active', 'no')
	await notebookLink.hover()
	await expect(noteIcon).toHaveCSS('--fixture-note-active', 'yes')
	await page.mouse.move(0, 0)
	await expect(noteIcon).toHaveCSS('--fixture-note-active', 'no')
	await notebookLink.focus()
	await page.keyboard.press('Tab')
	await page.keyboard.press('Shift+Tab')
	await expect(notebookLink).toBeFocused()
	await expect(noteIcon).toHaveCSS('--fixture-note-active', 'yes')

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
	await expect(externalStyles).toHaveCount(0)
	await expect(page.getByRole('heading', { name: notebook.title, exact: true })).toBeVisible()
	await expect(page).toHaveTitle(`${notebook.title} | E2E Garden`)
	await expect(editSource).toHaveJSProperty('href', `${baseURL}/admin/open/notes/meteor-notebook`)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')

	const article = page.locator('.fixture-note-page')
	await expect(article).toContainText(notebook.caption)
	await expect(article).toHaveCSS('--fixture-page-style', 'applied')

	// The same page template must refresh when only the slug changes.
	await clickInjectedNavigationLink('/pieces/notes/forest-notebook')
	await expect(page).toHaveURL(`${baseURL}/pieces/notes/forest-notebook`)
	await expect(page.getByRole('heading', { name: 'Forest Notebook', exact: true })).toBeVisible()
	await expect(article).not.toContainText(notebook.caption)
	await expect(article).toHaveCSS('--fixture-page-style', 'applied')
	await expect(page.locator(notePageStyle)).toHaveCount(1)
	await expect(page).toHaveTitle('Forest Notebook | E2E Garden')
	await expect(editSource).toHaveJSProperty('href', `${baseURL}/admin/open/notes/forest-notebook`)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')

	const encodedGuideUrl = '/%70ieces/records/field-guide'
	await clickInjectedNavigationLink(encodedGuideUrl)
	await expect(page).toHaveURL(`${baseURL}${encodedGuideUrl}`)
	await expect(page.getByRole('heading', { name: fieldGuide.title, exact: true })).toBeVisible()
	await expect(article).toHaveCount(0)
	await expect(page.locator(notePageStyle)).toHaveCount(0)
	await expect(page.getByRole('main')).toContainText('Ada Reader')
	await expect(page).toHaveTitle(`${fieldGuide.title} | E2E Garden`)
	await expect(editSource).toHaveJSProperty('href', `${baseURL}/admin/open/records/field-guide`)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')

	await clickInjectedNavigationLink('/pieces/notes/missing')
	await expect(page).toHaveURL(`${baseURL}/pieces/notes/missing`)
	await expect(editSource).toHaveCount(0)
	await expect(page.locator('html')).toHaveAttribute('data-listing-navigation', 'same-document')
})
