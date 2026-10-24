import { expect, test } from 'vitest'
import { renderMarkdown } from './render.server.js'

test('renders ordinary Markdown without page or filesystem context', () => {
	expect(renderMarkdown('# Welcome\n\nBrowse [pieces](/pieces).')).toBe(
		'<h1>Welcome</h1>\n<p>Browse <a href="/pieces">pieces</a>.</p>'
	)
})

test('raw HTML is text, not an active HTML override', () => {
	const html = renderMarkdown('<script>alert(1)</script>\n\n<style>body{display:none}</style>')
	expect(html).not.toContain('<script>')
	expect(html).not.toContain('<style>')
	expect(html).toContain('&lt;script&gt;')
})

test('rejects dangerous link protocols and preserves ordinary public asset URLs', () => {
	expect(renderMarkdown('[bad](javascript:alert(1))')).toContain('href=""')
	expect(renderMarkdown('![Cover](/pieces/assets/cover.png)')).toContain(
		'src="/pieces/assets/cover.png"'
	)
	expect(renderMarkdown('[relative](other.html)')).toContain('href="other.html"')
})

test('has no variables or author extensions and permits empty content', () => {
	expect(renderMarkdown('{{ latestPieces() }}')).toContain('{{ latestPieces() }}')
	expect(renderMarkdown('')).toBe('')
})
