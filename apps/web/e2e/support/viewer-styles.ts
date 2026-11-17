import { expect, type Locator, type Page } from '@playwright/test'

// Held template CSS must leave an accessible spinner, not visible loading copy.
export async function expectPreviewLoading(frame: Locator, label: string) {
	const status = frame.getByRole('status')
	const spinner = status.locator('svg')
	await expect(spinner).toBeVisible()
	await expect(spinner).toHaveAttribute('aria-hidden', 'true')
	await expect(spinner).toHaveAttribute('focusable', 'false')
	await expect(status).toMatchAriaSnapshot(`- status: ${label}`)
	const text = status.getByText(label, { exact: true })
	await expect(async () => {
		const copyBounds = await text.boundingBox()
		const spinnerBounds = await spinner.boundingBox()
		const frameBounds = await frame.boundingBox()
		expect(copyBounds, 'Accessible loading copy remains in the document').not.toBeNull()
		expect(
			copyBounds!.width,
			'Loading copy must not occupy readable visual space'
		).toBeLessThanOrEqual(1)
		expect(copyBounds!.height, 'Loading copy must not occupy a visible line').toBeLessThanOrEqual(1)
		expect(spinnerBounds, 'Loading spinner has rendered bounds').not.toBeNull()
		expect(frameBounds, 'Loading frame has rendered bounds').not.toBeNull()
		expect(
			Math.abs(
				spinnerBounds!.x + spinnerBounds!.width / 2 - frameBounds!.x - frameBounds!.width / 2
			),
			'Loading spinner is horizontally centered in its frame'
		).toBeLessThan(1)
		expect(
			Math.abs(
				spinnerBounds!.y + spinnerBounds!.height / 2 - frameBounds!.y - frameBounds!.height / 2
			),
			'Loading spinner is vertically centered in its frame'
		).toBeLessThan(1)
	}).toPass({ timeout: 5000 })
}

// Exercise the shared spinner's theme and motion contract once, while Share CSS is held.
export async function expectPreviewLoadingThemeAndMotion(page: Page, frame: Locator) {
	const spinner = frame.getByRole('status').locator('svg')
	const theme = await spinner.evaluate((element) => {
		const probe = document.createElement('span')
		probe.style.color = 'var(--color-primary)'
		element.parentElement!.append(probe)
		const primary = getComputedStyle(probe).color
		probe.remove()
		return {
			token: getComputedStyle(element).getPropertyValue('--color-primary').trim(),
			primary
		}
	})
	expect(theme.token).not.toBe('')
	await expect(spinner).toHaveCSS('color', theme.primary)

	const transform = () => spinner.evaluate((element) => getComputedStyle(element).transform)
	await page.emulateMedia({ reducedMotion: 'no-preference' })
	const initial = await transform()
	await expect.poll(transform).not.toBe(initial)
	await page.emulateMedia({ reducedMotion: 'reduce' })
	await expect(spinner).toHaveCSS('animation-name', 'none')
	await expect(spinner).toHaveCSS('transform', 'none')
	await expect(spinner).toBeVisible()
	await page.emulateMedia({ reducedMotion: 'no-preference' })
	const resumed = await transform()
	await expect.poll(transform).not.toBe(resumed)
}

export async function styles(page: Page) {
	return page.evaluate(() =>
		Array.from(document.styleSheets)
			.flatMap((sheet) => Array.from(sheet.cssRules, (rule) => rule.cssText))
			.join('\n')
	)
}

// Singular book-page belongs to OG Book; book-cover is also used by Page's Book icon.
export const bookOpengraphCSS = /\.book-page\.(svelte-[\w-]+)/
// Every built-in OG has this scoped selector, and no Page or Icon does.
export const opengraphCSS = /\.accent-bar\.(svelte-[\w-]+)/g
export function opengraphScopes(css: string) {
	return [...new Set(Array.from(css.matchAll(opengraphCSS), (match) => match[1]))]
}
