import { readFileSync } from 'node:fs'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'svelte/server'
import type { PieceLinks } from '#lib/pieces/navigation.js'
import ViewerHeader from './ViewerHeader.svelte'

const { page, resolve } = vi.hoisted(() => ({
	page: { url: new URL('https://app.test/') },
	resolve: vi.fn(() => {
		throw new Error('Could not get the request store. This is an internal error.')
	})
}))
vi.mock('$app/state', () => ({ page }))
vi.mock('$app/paths', () => ({ resolve }))

function links(root = '/admin/piece/books/%E6%BA%90%20%23%3F%25.books.md'): PieceLinks {
	return {
		source: `${root}/source`,
		overview: `${root}/published`,
		page: `${root}/published/page`,
		icon: `${root}/published/icon`,
		share: `${root}/published/share`
	}
}

beforeEach(() => {
	page.url = new URL('https://app.test/')
	vi.clearAllMocks()
})

test.each(['overview', 'page', 'icon', 'share'] as const)(
	'%s is active using serialized loader links without a render request store',
	(tab) => {
		const navigation = links()
		page.url = new URL(navigation[tab], 'https://app.test')
		const html = render(ViewerHeader, { props: { links: navigation } }).body
		expect(html).toContain(`href="${navigation.source}"`)
		expect(html).toContain('aria-label="Back to editor"')
		expect(html).toContain('title="Back to editor"')
		expect(html).toContain('aria-label="Published views"')
		expect(html).toContain(`href="${navigation[tab]}" aria-current="page"`)
		expect(html.match(/aria-current="page"/g)).toHaveLength(1)
		for (const label of ['Overview', 'Page', 'Icon', 'Share']) expect(html).toContain(label)
		expect(html).not.toContain('Logs')
		expect(html).not.toContain('<main')
		expect(html).not.toContain('target="_blank"')
		expect(resolve).not.toHaveBeenCalled()
	}
)

test('mounted loader links preserve active tab and editor destination', () => {
	const navigation = links('/garden/admin/piece/books/book.md')
	page.url = new URL(navigation.icon, 'https://app.test')
	const html = render(ViewerHeader, { props: { links: navigation } }).body
	expect(html).toContain(`href="${navigation.icon}" aria-current="page"`)
	expect(html).toContain(`href="${navigation.source}"`)
	expect(resolve).not.toHaveBeenCalled()
})

test('trailing slash still identifies the active view', () => {
	const navigation = links()
	page.url = new URL(navigation.overview + '/', 'https://app.test')
	const html = render(ViewerHeader, { props: { links: navigation } }).body
	expect(html).toContain(`href="${navigation.overview}" aria-current="page"`)
})

test('replacement loader links do not retain a previous source identity', () => {
	render(ViewerHeader, { props: { links: links('/admin/piece/first.md') } })
	const navigation = links('/admin/piece/second.md')
	page.url = new URL(navigation.share, 'https://app.test')
	const html = render(ViewerHeader, { props: { links: navigation } }).body
	expect(html).toContain('/second.md/published/share')
	expect(html).toContain('aria-current="page"')
	expect(html).not.toContain('first')
})

test('back link uses the same decorative arrow icon as Preview, not a visible text label', () => {
	const navigation = links()
	const html = render(ViewerHeader, { props: { links: navigation } }).body
	const anchors = html.match(/<a\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/a>/g) ?? []
	const back = anchors.find((anchor) => anchor.includes('aria-label="Back to editor"'))!
	expect(back).toContain(`href="${navigation.source}"`)
	expect(back).toContain('title="Back to editor"')
	expect(back).toMatch(/<svg\b[^>]*aria-hidden="true"/)
	expect(back).toMatch(/<svg\b[^>]*focusable="false"/)
	expect(
		back
			.replace(/<!--[^]*?-->/g, '')
			.replace(/<[^>]*>/g, '')
			.trim()
	).toBe('')
	expect(back).not.toContain('target=')
	expect(resolve).not.toHaveBeenCalled()
})

test('Published header consumes the narrowly scoped shared bar stylesheet', () => {
	const published = readFileSync(new URL('./ViewerHeader.svelte', import.meta.url), 'utf8')
	expect(published).toContain("ViewerBar.css'")
	expect(published).toContain("'virtual:icons/ph/arrow-left'")
	for (const name of [
		'viewer-bar',
		'viewer-bar-back',
		'viewer-bar-links',
		'viewer-bar-link',
		'viewer-bar-label'
	])
		expect(published).toContain(`class="${name}`)
	const css = readFileSync(new URL('./ViewerBar.css', import.meta.url), 'utf8')
	for (const declaration of [
		'position: sticky',
		'top: 0',
		'z-index: 100',
		'display: grid',
		"grid-template-areas: 'back links label'",
		'align-items: center',
		'gap: var(--space-3)',
		'padding: var(--space-2) var(--space-4)',
		'font-size: var(--font-size-small)',
		'text-transform: uppercase',
		'font-size: 0.9em',
		'opacity: 0.85',
		'letter-spacing: 0.05em'
	])
		expect(css).toContain(declaration)
	expect(published).not.toContain('<style>')
})

test('shared bar stacks mode/back above full-width wrapping tabs on mobile, with comfortable targets', () => {
	const css = readFileSync(new URL('./ViewerBar.css', import.meta.url), 'utf8')
	const mobile = css.slice(css.indexOf('@media (max-width: 600px)'))
	for (const declaration of [
		"grid-template-areas: 'back label' 'links links'",
		'justify-self: stretch',
		'flex-wrap: wrap',
		'flex: 1 0 auto',
		'padding-inline: var(--space-1)',
		'overflow-x: visible'
	])
		expect(mobile).toContain(declaration)
	expect(css).toContain('min-width: 44px')
	expect(css).toContain('min-height: 44px')
	expect(mobile).not.toContain('display: none')
	expect(mobile).not.toContain('position: absolute')
	const html = render(ViewerHeader, { props: { links: links() } }).body
	expect(html).toContain('<nav class="viewer-bar-links" aria-label="Published views"')
	expect(html).toContain('class="viewer-bar-label">Published</span>')
	for (const label of ['Overview', 'Page', 'Icon', 'Share']) expect(html).toContain(`>${label}</a>`)
})

test('shared active/hover/focus states are token-based, visibly distinguish selection and retain Preview disabled styling', () => {
	const css = readFileSync(new URL('./ViewerBar.css', import.meta.url), 'utf8')
	for (const declaration of [
		'color-mix(in srgb, var(--color-on-tertiary-container) 10%, transparent)',
		'color-mix(in srgb, var(--color-on-tertiary-container) 20%, transparent)',
		"[aria-current='page']",
		'.viewer-bar-link.active',
		'font-weight: var(--font-weight-bold)',
		'text-decoration: underline',
		'a:focus-visible',
		'outline: 2px solid currentColor',
		'outline-offset: -2px',
		'.viewer-bar-link.disabled',
		'opacity: 0.35',
		'pointer-events: none'
	])
		expect(css).toContain(declaration)
	expect(css).not.toContain('var(--color-surface-container)')
	expect(css).not.toContain('rgba(')
})

test('rendering after an await still needs no paths API', async () => {
	await Promise.resolve()
	const html = render(ViewerHeader, { props: { links: links() } }).body
	expect(html).toContain('Back to editor')
	expect(resolve).not.toHaveBeenCalled()
})
