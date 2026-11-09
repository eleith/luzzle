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

async function renderMarkdownTree(markdown: string) {
	const html = await processMarkdown(markdown, themes)
	return unified()
		.use(rehypeRaw)
		.runSync({
			type: 'root',
			children: [{ type: 'raw', value: html }],
		})
}

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
		const tree = await renderMarkdownTree(
			`First[^shared], then again[^shared].\n\n[^shared]: ${definition}`
		)
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

test('labels tight, nested and loose tasks without changing their states', async () => {
	const tree = await renderMarkdownTree(
		[
			'- [x] Parent **ta**sk.',
			'  - [ ] Child `task`.',
			'- [ ] Before <span hidden>secret</span><span aria-hidden="true">decoration</span>after<br>break.',
			'- [ ] Task title',
			'  <p>Additional text</p>',
			'',
			'## Loose tasks',
			'',
			'- [ ] Loose *task*.',
			'',
			'  More details.',
			'',
			'- [x] Another loose task.',
		].join('\n')
	)
	const checkboxes: Element[] = []
	visit(tree, 'element', (node) => {
		if (node.tagName === 'input' && node.properties.type === 'checkbox') checkboxes.push(node)
	})

	expect(checkboxes.map((checkbox) => checkbox.properties.ariaLabel)).toEqual([
		'Parent task.',
		'Child task.',
		'Before after break.',
		'Task title Additional text',
		'Loose task.',
		'Another loose task.',
	])
	expect(checkboxes.map((checkbox) => Boolean(checkbox.properties.checked))).toEqual([
		true,
		false,
		false,
		false,
		false,
		true,
	])
	expect(checkboxes.every((checkbox) => checkbox.properties.disabled === true)).toBe(true)
})

test('preserves author-supplied task names while labeling unnamed raw tasks', async () => {
	const tree = await renderMarkdownTree(`
<label for="native-task">Explicit native name</label>

<ul>
<li class="task-list-item"><input type="checkbox" disabled aria-label="Explicit name">Different text</li>
<li class="task-list-item"><input type="checkbox" disabled aria-labelledby="task-name"><span id="task-name">Referenced name</span></li>
<li class="task-list-item"><input id="native-task" type="checkbox" disabled>Different native text</li>
<li class="task-list-item"><input type="checkbox" disabled>Derived <em>name</em>.</li>
</ul>
`)
	const checkboxes: Element[] = []
	const labels: Element[] = []
	visit(tree, 'element', (node) => {
		if (node.tagName === 'input' && node.properties.type === 'checkbox') checkboxes.push(node)
		if (node.tagName === 'label') labels.push(node)
	})

	expect(checkboxes).toHaveLength(4)
	expect(checkboxes[0].properties.ariaLabel).toBe('Explicit name')
	expect(checkboxes[1].properties.ariaLabel).toBeUndefined()
	expect(checkboxes[1].properties.ariaLabelledBy).toEqual(['task-name'])
	expect(checkboxes[2].properties.ariaLabel).toBeUndefined()
	expect(checkboxes[2].properties.id).toBe('native-task')
	expect(labels).toHaveLength(1)
	expect(labels[0].properties.htmlFor).toEqual(['native-task'])
	expect(textContent(labels[0])).toBe('Explicit native name')
	expect(checkboxes[3].properties.ariaLabel).toBe('Derived name.')
})
