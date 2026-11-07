import { expect, test } from './support/test.js'
import { notebook, readingBook } from './support/fixture.js'

test('root typography scales from the mobile minimum to the desktop size', async ({ page }) => {
	await page.goto(notebook.publicUrl)

	for (const [width, fontSize] of [
		[390, '17.6px'],
		[704, '19.8px'],
		[1440, '22px']
	] as const) {
		await page.setViewportSize({ width, height: 900 })
		await expect(page.locator('html')).toHaveCSS('font-size', fontSize)
	}
})

test('shared prose follows its template body size without restyling metadata labels', async ({
	page
}) => {
	for (const piece of [notebook, readingBook]) {
		await page.goto(piece.publicUrl)
		const prose = page.locator('main .markdown')
		await expect(prose.getByRole('heading', { name: 'A quiet section' })).toBeVisible()
		const typography = await prose.evaluate((element) => {
			const body = getComputedStyle(element)
			const heading = getComputedStyle(element.querySelector('h2')!)
			return {
				bodySize: parseFloat(body.fontSize),
				parentSize: parseFloat(getComputedStyle(element.parentElement!).fontSize),
				lineHeight: parseFloat(body.lineHeight),
				headingSize: parseFloat(heading.fontSize),
				headingSpaceBefore: parseFloat(heading.marginTop),
				headingSpaceAfter: parseFloat(heading.marginBottom)
			}
		})
		expect(typography.bodySize).toBe(typography.parentSize)
		expect(typography.lineHeight / typography.bodySize).toBeCloseTo(1.6)
		expect(typography.headingSize / typography.bodySize).toBeCloseTo(1.35)
		expect(typography.headingSpaceBefore).toBeGreaterThan(typography.headingSpaceAfter)

		if (piece === readingBook) {
			const labelSize = await page
				.getByRole('heading', { name: 'Note', exact: true })
				.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
			expect(labelSize).toBeLessThan(typography.bodySize)
		}
	}
})

test('the reading page keeps a quiet headline and centered, aligned prose', async ({ page }) => {
	await page.goto(notebook.publicUrl)
	const headline = page.getByRole('heading', { name: notebook.title, exact: true })
	await expect(headline).toBeVisible()

	for (const width of [390, 1440]) {
		await page.setViewportSize({ width, height: 900 })
		const metrics = await page.locator('main').evaluate((element) => {
			const heading = element.querySelector('h1')!
			const prose = element.querySelector('.markdown')!
			const titleBox = heading.getBoundingClientRect()
			const proseBox = prose.getBoundingClientRect()
			return {
				titleSize: parseFloat(getComputedStyle(heading).fontSize),
				bodySize: parseFloat(getComputedStyle(prose).fontSize),
				titleLeft: titleBox.left,
				proseLeft: proseBox.left,
				proseRight: innerWidth - proseBox.right,
				proseWidth: proseBox.width
			}
		})
		expect(metrics.titleSize / metrics.bodySize).toBeCloseTo(2)
		expect(metrics.proseRight).toBeCloseTo(metrics.proseLeft)
		expect(metrics.titleLeft).toBeCloseTo(metrics.proseLeft)
		if (width === 390) {
			expect(metrics.proseLeft).toBeGreaterThanOrEqual(20)
			expect(metrics.proseLeft).toBeLessThanOrEqual(24)
		} else {
			expect(metrics.proseWidth).toBeLessThanOrEqual(800)
		}
	}
})
