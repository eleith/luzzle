import { expect, test } from 'vitest'
import { render } from 'svelte/server'
import SourceContent from './SourceContent.svelte'

function renderSource(content: string, mime: string) {
	return render(SourceContent, {
		props: {
			value: {
				key: 'source',
				output: 'markdown',
				field: 'Content',
				value: content,
				mime
			},
			label: 'Markdown: Asset 1, Content'
		}
	}).body
}

test('recorded HTML is shown as source text, not executed or rendered as a document', () => {
	const content = '<script>alert("x")</script> & <iframe src="https://bad.test"></iframe>'

	const html = renderSource(content, 'text/html')

	expect(html).toContain('&lt;script>alert("x")&lt;/script> &amp; &lt;iframe')
	expect(html).not.toMatch(/<(?:script|iframe)\b/)
	expect(html).toContain('role="region"')
	expect(html).toContain('tabindex="0"')
	expect(html).toContain('aria-label="Markdown: Asset 1, Content source"')
})

test('JSON source is passed through the lossless formatter before display', () => {
	const html = renderSource('{"count":2}', 'application/json')

	expect(html).toContain('{\n  "count": 2\n}')
})
