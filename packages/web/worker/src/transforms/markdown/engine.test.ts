import { expect, test } from 'vitest'
import { unified } from 'unified'
import rehypeRaw from 'rehype-raw'
import { visit } from 'unist-util-visit'
import type { Element } from 'hast'
import { validateConfig } from '@luzzle/web.config'
import { processMarkdown } from './engine.js'

const themes = validateConfig({}).theme.markdown.code
const inlineDefinition =
	'First **para**graph. A [link](https://example.com), <em>in</em>line, and `code`.'
const inlinePreview = 'First paragraph. A link, inline, and code.'

function textContent(element: Element): string {
	const text: string[] = []
	visit(element, 'text', (node) => {
		text.push(node.value)
	})
	return text.join('')
}

test.each([
	{
		kind: 'inline',
		definition: inlineDefinition,
		preview: inlinePreview,
	},
	{
		kind: 'block-rich',
		definition: [
			inlineDefinition,
			'',
			'    Second paragraph.',
			'',
			'    ```js',
			'    const preview = "text";',
			'    ```',
			'',
			'    <p>Raw<strong>para</strong>.</p><p>Last line<br>break.</p>',
		].join('\n'),
		preview: `${inlinePreview} Second paragraph. const preview = "text"; Rawpara. Last line break.`,
	},
])(
	'keeps repeated $kind sidenotes intact with independent controls and previews',
	async ({ definition, preview: expectedPreview }) => {
		const html = await processMarkdown(
			`First[^shared], then again[^shared].\n\n[^shared]: ${definition}`,
			themes
		)
		const tree = unified()
			.use(rehypeRaw)
			.runSync({
				type: 'root',
				children: [{ type: 'raw', value: html }],
			})
		const notes: Element[] = []
		const slots: Element[] = []
		const references: Element[] = []
		visit(tree, 'element', (node) => {
			if (node.properties.popover === 'auto') notes.push(node)
			const classes = node.properties.className
			if (!Array.isArray(classes)) return
			if (classes.includes('sidenote__slot')) slots.push(node)
			if (classes.includes('sidenote__button')) references.push(node)
		})

		expect(notes).toHaveLength(2)
		expect(slots).toHaveLength(2)
		expect(references).toHaveLength(2)
		expect(new Set(notes.map((note) => note.properties.id)).size).toBe(2)
		for (const [index, slot] of slots.entries()) {
			const children = slot.children.filter((node): node is Element => node.type === 'element')
			expect(children).toHaveLength(2)
			const [preview, note] = children
			expect(preview.tagName).toBe('button')
			expect(preview.properties.tabIndex).toBe(-1)
			expect(note.properties.popover).toBe('auto')
			expect(preview.properties.popoverTarget).toBe(note.properties.id)
			expect(references[index].properties.popoverTarget).toBe(note.properties.id)
			expect(textContent(preview)).toBe(`shared ${expectedPreview}`)

			const closeButtons: Element[] = []
			visit(note, 'element', (node) => {
				if (node.tagName === 'button') closeButtons.push(node)
			})
			expect(closeButtons).toHaveLength(1)
			expect(closeButtons[0].properties.popoverTarget).toBe(note.properties.id)
			expect(closeButtons[0].properties.popoverTargetAction).toBe('hide')
			expect(note.properties.tabIndex).toBe(-1)
			expect(textContent(note)).toContain('First paragraph.')
			if (definition.includes('Second paragraph.')) {
				expect(textContent(note)).toContain('Second paragraph.')
			}
		}
	}
)
