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
	},
])(
	'keeps repeated $kind sidenotes and their links intact with independent controls',
	async ({ definition }) => {
		const tree = await renderMarkdownTree(
			`First[^shared], then again[^shared].\n\n[^shared]: ${definition}`
		)
		const notes: Element[] = []
		const slots: Element[] = []
		const references: Element[] = []
		const locators: Element[] = []
		const section = tree.children.find((node): node is Element => node.type === 'element')
		const lead = section?.children.find((node): node is Element => node.type === 'element')
		visit(tree, 'element', (node) => {
			if (node.properties.ariaLabel === 'Locate sidenote shared') locators.push(node)
			if (node.properties.popover === 'auto') notes.push(node)
			const classes = node.properties.className
			if (!Array.isArray(classes)) return
			if (classes.includes('sidenote__slot')) slots.push(node)
			if (classes.includes('sidenote__button')) references.push(node)
		})

		expect(notes).toHaveLength(2)
		expect(slots).toHaveLength(2)
		expect(references).toHaveLength(2)
		expect(locators).toHaveLength(2)
		expect(new Set(notes.map((note) => note.properties.id)).size).toBe(2)
		for (const [index, slot] of slots.entries()) {
			const note = notes[index]
			expect(slot.children).toEqual([note])
			expect(references[index].properties.popoverTarget).toBe(note.properties.id)
			expect(locators[index].properties.href).toBe(`#${note.properties.id}`)

			const links: Element[] = []
			const closeButtons: Element[] = []
			const labels: Element[] = []
			const disclosures: Element[] = []
			visit(note, 'element', (node) => {
				if (node.tagName === 'a') links.push(node)
				if (node.tagName === 'button') closeButtons.push(node)
				if (node.tagName === 'details') disclosures.push(node)
				const classes = node.properties.className
				if (Array.isArray(classes) && classes.includes('sidenote__label')) labels.push(node)
			})
			expect(links).toHaveLength(1)
			expect(links[0].properties.href).toBe('https://example.com')
			expect(textContent(links[0])).toBe('link')
			expect(closeButtons).toHaveLength(1)
			expect(closeButtons[0].properties.popoverTarget).toBe(note.properties.id)
			expect(closeButtons[0].properties.popoverTargetAction).toBe('hide')
			expect(closeButtons[0].properties.ariaLabel).toBe('Close sidenote shared')
			expect(textContent(closeButtons[0])).toContain('×')
			expect(textContent(closeButtons[0])).not.toContain('Sidenote shared')
			expect(labels).toHaveLength(1)
			expect(textContent(labels[0])).toBe('Sidenote shared')
			expect(labels[0].properties.ariaHidden).toBe('true')
			expect(note.properties.tabIndex).toBe(-1)
			expect(textContent(note)).toContain('First paragraph.')
			if (definition.includes('Second paragraph.')) {
				expect(lead?.tagName).toBe('p')
				expect(lead && textContent(lead)).toBe('Firstsharedshared, then againsharedshared.')
				expect(section?.children).toContain(slot)
				expect(disclosures).toHaveLength(1)
				expect(disclosures[0].properties.open).toBeUndefined()
				expect(textContent(disclosures[0])).toContain('Second paragraph.')
				expect(textContent(disclosures[0])).not.toContain('First paragraph.')
			} else {
				expect(disclosures).toHaveLength(0)
			}
		}
	}
)

test.each(['[Before[^1] after](/article)', '<a href="/article">Before[^1] after</a>'])(
	'keeps the label and note links intact in %s',
	async (linkedLabel) => {
		const tree = await renderMarkdownTree(`${linkedLabel}\n\n[^1]: A [citation](/source).`)
		const links: Element[] = []
		const noteIds: unknown[] = []
		let referenceFollowsLink = false
		visit(tree, 'element', (node, index, parent) => {
			if (node.tagName === 'a') links.push(node)
			if (node.properties.popover === 'auto') noteIds.push(node.properties.id)
			if (node.tagName !== 'span' || !Array.isArray(node.properties.className)) return
			if (node.properties.className.includes('sidenote') && parent && index !== undefined) {
				referenceFollowsLink = parent.children[index - 1] === links[0]
			}
		})

		expect(links.map((link) => [link.properties.href, textContent(link)])).toEqual([
			['/article', 'Before after'],
			['#sidenote-1', '1'],
			['/source', 'citation'],
		])
		expect(noteIds).toEqual(['sidenote-1'])
		expect(referenceFollowsLink).toBe(true)
	}
)

test('preserves fragments on linked headings with inline and block notes', async () => {
	const tree = await renderMarkdownTree(
		[
			'# [Before[^1] after](/article)',
			'',
			'# [Read[^2] more](/notes)',
			'',
			'# [Before[^3] after](/article)',
			'',
			'[^1]: First paragraph.',
			'',
			'[^2]: A longer note.',
			'',
			'    Second paragraph.',
			'',
			'[^3]: A [citation](/source).',
		].join('\n')
	)
	const ids: Array<Element['properties']['id']> = []
	visit(tree, 'element', (node) => {
		if (node.tagName === 'h1') ids.push(node.properties.id)
	})

	expect(ids).toEqual([
		'before11-first-paragraphsidenote-111-first-paragraph-after',
		'read2-more',
		'before33-asidenote-333-a-citation-after',
	])
})

test('preserves the heading fragment and puts a raw HTML tail behind Read more', async () => {
	const tree = await renderMarkdownTree(
		'# Heading[^1]\n\n[^1]: First paragraph.\n\n    <p>Raw second paragraph.</p>'
	)
	const headings: Element[] = []
	const disclosures: Element[] = []
	visit(tree, 'element', (node) => {
		if (node.tagName === 'h1') headings.push(node)
		if (node.tagName === 'details') disclosures.push(node)
	})

	expect(headings.map((heading) => heading.properties.id)).toEqual(['heading1'])
	expect(disclosures).toHaveLength(1)
	expect(textContent(disclosures[0])).toContain('Raw second paragraph.')
	expect(textContent(disclosures[0])).not.toContain('First paragraph.')
})

test('puts a plain-text tail after a raw lead paragraph behind Read more', async () => {
	const tree = await renderMarkdownTree('Citation[^1].\n\n[^1]: <p>Lead paragraph.</p>Actual tail')
	const disclosures: Element[] = []
	visit(tree, 'element', (node) => {
		if (node.tagName === 'details') disclosures.push(node)
	})

	expect(disclosures).toHaveLength(1)
	expect(textContent(disclosures[0])).toContain('Actual tail')
	expect(textContent(disclosures[0])).not.toContain('Lead paragraph.')
})

test.each([
	['Markdown', '| Source |\n| --- |\n| Citation[^1] |'],
	['raw HTML', '<table><tr><td>\n\nCitation[^1]\n\n</td></tr></table>'],
])('uses the native sheet for %s table sidenotes', async (_format, table) => {
	const tree = await renderMarkdownTree(`${table}\n\n[^1]: Lead.\n\n    [Second paragraph.](/source)`)
	const controls: Element[] = []
	const notes: Element[] = []
	visit(tree, 'element', (node) => {
		if (node.properties.ariaLabel === 'Sidenote 1' && node.tagName === 'button') controls.push(node)
		if (node.properties.popover === 'auto') notes.push(node)
		if (node.tagName === 'details' || node.properties.ariaLabel === 'Locate sidenote 1') {
			throw new Error('Table sidenotes should only use the native popover')
		}
	})

	expect(controls).toHaveLength(1)
	expect(notes).toHaveLength(1)
	expect(notes[0].properties.className).toContain('sidenote__content--sheet')
	expect(controls[0].properties.popoverTarget).toBe(notes[0].properties.id)
	expect(textContent(notes[0])).toContain('Second paragraph.')
})

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
