import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { render } from 'svelte/server'
import { createRawSnippet } from 'svelte'
import { assetPathToUrl } from '$lib/pieces/assets'
import { asset } from './fixtures/published'
import PieceOverview from './PieceOverview.svelte'

test('shared overview owns title, facts slot and actual output inspector, not a main landmark or publication policy', () => {
	const children = createRawSnippet(() => ({
		render: () => '<div class="overview-facts"><p>Caller facts fixture</p></div>'
	}))
	const html = render(PieceOverview, {
		props: {
			title: 'Piece <title & "text">',
			assets: [asset('image.original', 'cover.jpg')],
			fileUrl: (path) => assetPathToUrl(path, '/cdn'),
			children
		}
	}).body.replace(/<!--[^]*?-->/g, '')
	expect(html).toContain('Piece &lt;title &amp; "text">')
	expect(html).toContain('Caller facts fixture')
	expect(html).toContain('Image</caption>')
	expect(html).toContain('href="/cdn/pieces/assets/cover.jpg"')
	expect(html).toContain('Outputs</h2>')
	expect(html).not.toContain('<main')
	expect(html).not.toContain('Last publish')
	expect(html.indexOf('Caller facts fixture')).toBeLessThan(html.indexOf('Image</caption>'))
})

test('shared overview omits not-yet-produced assets and puts caller logs after its facts', () => {
	const children = createRawSnippet(() => ({
		render: () => '<p>Pending facts fixture</p><section><h2>Preview logs</h2></section>'
	}))
	const html = render(PieceOverview, {
		props: {
			title: 'Preview',
			fileUrl: () => {
				throw new Error('No asset callback expected')
			},
			children
		}
	}).body
	expect(html).toContain('Pending facts fixture')
	expect(html).toContain('Preview logs')
	expect(html.indexOf('Pending facts fixture')).toBeLessThan(html.indexOf('Preview logs'))
	expect(html).not.toContain('None recorded')
	expect(html).not.toContain('Outputs</h2>')
	expect(html).not.toContain('<main')
})

test('shared overview places caller facts and logs before actual output tables', () => {
	const children = createRawSnippet(() => ({
		render: () => '<p>Facts fixture</p><section><h2>Preview logs</h2></section>'
	}))
	const html = render(PieceOverview, {
		props: {
			title: 'Preview',
			assets: [asset('image.original', 'cover.jpg')],
			fileUrl: (path) => assetPathToUrl(path, '/cdn'),
			children
		}
	}).body
	expect(html).toContain('Image</caption>')
	expect(html.indexOf('Facts fixture')).toBeLessThan(html.indexOf('Preview logs'))
	expect(html.indexOf('Preview logs')).toBeLessThan(html.indexOf('Image</caption>'))
})

test('Preview and Published share the same badge styles and success/pending color rules', () => {
	const source = readFileSync(new URL('./PieceOverview.svelte', import.meta.url), 'utf8')
	const success = source.match(
		/\[data-status='matching'\]\),\s*\.overview :global\(\.overview-facts \.status\[data-status='completed'\]\)\s*\{([^}]+)\}/
	)?.[1]
	expect(success).toContain('background: var(--color-primary-container)')
	expect(success).toContain('color: var(--color-on-primary-container)')
	const pending = source.match(
		/\[data-status='changed'\]\),\s*\.overview :global\(\.overview-facts \.status\[data-status='running'\]\)\s*\{([^}]+)\}/
	)?.[1]
	expect(pending).toContain('background: var(--color-secondary-container)')
	expect(pending).toContain('color: var(--color-on-secondary-container)')
})

test('shared overview can show empty preview outputs without guessing URLs or requiring publication facts', () => {
	const html = render(PieceOverview, {
		props: {
			title: 'Preview title',
			assets: [],
			fileUrl: () => undefined,
			assetsHeading: 'Preview assets'
		}
	}).body
	expect(html).toContain('Preview title')
	expect(html).toContain('Preview assets</h2>')
	expect(html).toContain('None recorded')
	expect(html).not.toContain('<a ')
	expect(html).not.toContain('Publication')
})
