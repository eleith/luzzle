import path from 'node:path'
import { createAppDb } from '@luzzle/web.db'
import { expect, test } from './support/test.js'
import { fieldGuide, fieldNotesTag, notebook } from './support/fixture.js'

const tagUrl = `/tags/${fieldNotesTag.slug}`

test.describe('server-rendered tag listing', () => {
	test.use({ javaScriptEnabled: false })

	test('mixed icons leave one public link across each card', async ({ page }) => {
		await page.goto(tagUrl)
		const main = page.getByRole('main')
		await expect(main.getByRole('heading', { name: `Tag: #${fieldNotesTag.slug}` })).toHaveCount(1)
		for (const piece of [notebook, fieldGuide]) {
			const link = main.getByRole('link', { name: piece.title, exact: true })
			await expect(link).toBeVisible()
			await expect(link).toHaveJSProperty('href', new URL(piece.publicUrl, page.url()).href)
		}
		await expect(main.getByRole('link')).toHaveCount(2)
		const external = main.locator('.fixture-note-icon')
		await expect(external).toBeVisible()
		await expect(external).toHaveText(notebook.title)
		await expect(external).toHaveAttribute('data-width', '125')
		const guide = main.locator('.piece-card').filter({ hasText: fieldGuide.title })
		await expect(guide.locator('.poster-title')).toHaveText(fieldGuide.title)
	})
})

// A distinct worker fixture gets its own temporary app server/database. Other suites
// should still see only their original three pieces on the home and search routes.
const paginationTest = test.extend<object, { pagedTag: string }>({
	pagedTag: [
		async ({ appServer }, use) => {
			const slug = 'paged-tag'
			const rows = Array.from({ length: 51 }, (_, index) => {
				const id = `entry-${String(index).padStart(2, '0')}`
				const type = index === 49 ? notebook.type : fieldGuide.type
				return {
					id,
					type,
					slug: id,
					key: id,
					title: id,
					file_path: `${id}.${type}.md`,
					date_added: 1,
					date_consumed: index === 50 ? 2 : 1,
					json_metadata: JSON.stringify({ title: id })
				}
			}).reverse() // Insert tied dates in the opposite order from the expected listing.
			const db = createAppDb(path.join(appServer.directory, 'data/luzzle.sqlite'))
			try {
				await db.insertInto('web_pieces').values(rows).execute()
				await db
					.insertInto('web_pieces_tags')
					.values(
						rows.map(({ id, type }) => ({
							piece_id: id,
							piece_slug: id,
							piece_type: type,
							slug,
							tag: slug
						}))
					)
					.execute()
			} finally {
				await db.destroy()
			}
			await use(`/tags/${slug}`)
		},
		{ scope: 'worker' }
	]
})

paginationTest.describe('without JavaScript', () => {
	paginationTest.use({ javaScriptEnabled: false })
	paginationTest(
		'tag pagination supports native links, direct visits and browser history',
		async ({ page, baseURL, pagedTag }) => {
			const main = page.getByRole('main')
			const lastOnFirst = main.getByRole('link', { name: 'entry-48', exact: true })
			const pageTwoIcon = main.locator('.fixture-note-icon')
			await page.goto(pagedTag)
			await expect(lastOnFirst).toBeVisible()
			await expect(main.getByRole('link', { name: 'entry-49', exact: true })).toHaveCount(0)
			await main.getByRole('link', { name: 'next', exact: true }).click()
			await expect(page).toHaveURL(`${baseURL}${pagedTag}?page=2`)
			await expect(pageTwoIcon).toHaveText('entry-49')
			await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
			await expect(lastOnFirst).toHaveCount(0)
			await page.reload()
			await expect(pageTwoIcon).toHaveText('entry-49')
			const prev = main.getByRole('link', { name: 'prev', exact: true })
			await expect(prev).toHaveAttribute('href', '?page=1')
			await prev.click()
			await expect(lastOnFirst).toBeVisible()
			await page.goBack()
			await expect(page).toHaveURL(`${baseURL}${pagedTag}?page=2`)
			await expect(pageTwoIcon).toHaveText('entry-49')
		}
	)
})
