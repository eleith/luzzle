import { expect, test } from 'vitest'
import { unified } from 'unified'
import rehypeRaw from 'rehype-raw'
import { visit } from 'unist-util-visit'
import type { Element } from 'hast'
import { validateConfig } from '@luzzle/web.config'
import { processMarkdown } from './engine.js'

const themes = validateConfig({}).theme.markdown.code

test.each([
	['inline', 'First paragraph.'],
	['block-rich', 'First paragraph.\n\n    Second paragraph.'],
])('keeps repeated %s sidenotes intact with independent controls', async (_kind, definition) => {
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
	const buttons: Element[] = []
	visit(tree, 'element', (node) => {
		if (node.properties.popover === 'auto') notes.push(node)
		if (node.tagName === 'button') buttons.push(node)
	})

	expect(notes).toHaveLength(2)
	expect(new Set(notes.map((note) => note.properties.id)).size).toBe(2)
	for (const note of notes) {
		const actions = buttons
			.filter((button) => button.properties.popoverTarget === note.properties.id)
			.map((button) => button.properties.popoverTargetAction ?? 'toggle')
		expect(actions.sort()).toEqual(['hide', 'toggle'])
		const text: string[] = []
		visit(note, 'text', (node) => {
			text.push(node.value)
		})
		expect(text.join('')).toContain('First paragraph.')
		if (definition.includes('Second paragraph.')) {
			expect(text.join('')).toContain('Second paragraph.')
		}
	}
})
