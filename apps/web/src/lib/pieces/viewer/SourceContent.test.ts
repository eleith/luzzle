import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { render } from 'svelte/server'
import SourceContent from './SourceContent.svelte'

function source(content: string, mime = 'text/plain') {
	return render(SourceContent, {
		props: {
			value: {
				key: 'private-key',
				output: 'custom.output',
				field: 'Content',
				value: content,
				mime
			},
			label: 'Custom.output: Asset 1, Content'
		}
	}).body.replace(/<!--[^]*?-->/g, '')
}

function escaped(text: string) {
	return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
}

function code(html: string) {
	return html.match(/<code[^>]*>([\s\S]*?)<\/code>/)?.[1].replace(/<\/?span\b[^>]*>/g, '')
}

test.each(['text/html', 'image/svg+xml', 'text/css', 'text/javascript', 'unknown'])(
	'%s content stays inert and complete instead of executing as markup or CSS',
	(mime) => {
		const text =
			'  <script>alert("x")</script>\r\n<iframe src="https://bad.test"></iframe> & <style>body{display:none}</style>\n  '
		const html = source(text, mime)
		expect(code(html)).toBe(escaped(text))
		for (const tag of ['<script', '<iframe', '<style', '<svg', '<img'])
			expect(html).not.toContain(tag)
		expect(html).not.toContain('private-key')
		expect(html).toContain('role="region"')
		expect(html).toContain('tabindex="0"')
		expect(html).toContain('aria-label="Custom.output: Asset 1, Content source"')
	}
)

test('JSON source is pretty-printed without changing numeric lexemes, duplicate keys or string escapes', () => {
	const html = source(
		'{"id":9007199254740993,"id":1e400,"html":"<script>bad()</script>","literal":"\\u0041"}',
		'application/json'
	)
	expect(code(html)).toBe(
		escaped(
			'{\n  "id": 9007199254740993,\n  "id": 1e400,\n  "html": "<script>bad()</script>",\n  "literal": "\\u0041"\n}'
		)
	)
	expect(html).not.toContain('<script>')
})

test('malformed JSON remains the full original text', () => {
	const content = ' { broken <script>alert(1)</script>\r\n'
	expect(code(source(content, 'application/json'))).toBe(escaped(content))
})

test('large source remains available in full rather than truncating the record', () => {
	const content = '  snow 雪 <tag> & \r\n'.repeat(12000)
	expect(code(source(content))).toBe(escaped(content))
})

test('source view uses the editor token palette with a bounded keyboard-scrollable viewport', () => {
	const file = readFileSync(new URL('./SourceContent.svelte', import.meta.url), 'utf8')
	expect(file).toContain("import '$lib/components/editor/themes/token-colors.css'")
	expect(file).toContain('class="syntax-highlight"')
	expect(file).toContain('max-height: 24rem')
	expect(file).toContain('overflow: auto')
	expect(file).toContain('var(--editor-foreground, var(--color-on-surface))')
	expect(file).toContain('var(--editor-background, var(--color-surface))')
	expect(file).not.toContain('{@html')
	expect(file).not.toContain('innerHTML')
})

test('highlighting is loaded after expansion/mount with a current-source guard and safe plain fallback', () => {
	const file = readFileSync(new URL('./SourceContent.svelte', import.meta.url), 'utf8')
	expect(file).toContain("import('./source-highlight')")
	expect(file).toContain('highlighted?.source === source && highlighted.mime === value.mime')
	expect(file).toContain('if (active) highlighted =')
	expect(file).toContain('active = false')
	expect(file).toContain('{token.text}')
	expect(file).not.toContain('fetch(')
	expect(file).not.toContain('clipboard')
})
