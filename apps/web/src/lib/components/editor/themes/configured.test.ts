import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { Compartment, EditorState, type Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { history, undo } from '@codemirror/commands'
import { ensureSyntaxTree, highlightingFor, syntaxTree } from '@codemirror/language'
import { markdown } from '@codemirror/lang-markdown'
import { yamlFrontmatter } from '@codemirror/lang-yaml'
import { highlightTree, tags as t, type Tag } from '@lezer/highlight'
import { configuredTheme } from './configured'

test.each(['light', 'dark'] as const)('highlights Markdown/YAML in %s mode', (mode) => {
	const doc = `---
title: "A title"
count: 42
published: true
# a comment
---
# Heading

**strong** and *emphasis* with \`code\` and [label](https://example.test).

> quote
`
	const state = EditorState.create({
		doc,
		extensions: [yamlFrontmatter({ content: markdown() }), configuredTheme(mode)]
	})
	expect(state.facet(EditorView.darkTheme)).toBe(mode === 'dark')

	const tree = ensureSyntaxTree(state, doc.length, 1000)
	expect(tree).not.toBeNull()
	const ranges: { text: string; classes: string }[] = []
	highlightTree(tree!, { style: (tags) => highlightingFor(state, tags) }, (from, to, classes) =>
		ranges.push({ text: doc.slice(from, to), classes })
	)
	const examples: [string, Tag][] = [
		['title', t.propertyName],
		['A title', t.string],
		['a comment', t.comment],
		['---', t.meta],
		['Heading', t.heading],
		['strong', t.strong],
		['emphasis', t.emphasis],
		['code', t.monospace],
		['https://example.test', t.url],
		['quote', t.quote]
	]
	for (const [text, tag] of examples) {
		const style = highlightingFor(state, [tag])
		expect(style, text).toBeTruthy()
		expect(
			ranges.some(
				(range) =>
					range.text.includes(text) &&
					style!.split(' ').every((name) => range.classes.split(' ').includes(name))
			),
			text
		).toBe(true)
	}

	// YAML's parser leaves unquoted scalars as content, rather than number/bool tags.
	for (const tag of [t.link, t.strikethrough, t.punctuation, t.number, t.bool, t.atom]) {
		expect(highlightingFor(state, [tag])).toBeTruthy()
	}
})

test('emits stable classes for other asset languages without another palette', () => {
	const state = EditorState.create({ extensions: configuredTheme('light') })
	const examples: [Tag, string][] = [
		[t.variableName, 'tok-name'],
		[t.function(t.variableName), 'tok-name'],
		[t.function(t.propertyName), 'tok-name'],
		[t.typeName, 'tok-name'],
		[t.tagName, 'tok-name'],
		[t.attributeName, 'tok-name'],
		[t.attributeValue, 'tok-string'],
		[t.keyword, 'tok-keyword'],
		[t.controlKeyword, 'tok-keyword'],
		[t.operator, 'tok-operator'],
		[t.processingInstruction, 'tok-meta'],
		[t.contentSeparator, 'tok-contentSeparator']
	]
	for (const [tag, name] of examples) {
		expect(highlightingFor(state, [tag])?.split(' ')).toContain(name)
	}
})

test('CSS binds the token classes to the accepted palette instead of fixed colors', () => {
	const css = readFileSync(new URL('./configured.css', import.meta.url), 'utf8')
	const roles = {
		heading: 'heading',
		strong: 'strong',
		emphasis: 'emphasis',
		quote: 'quote',
		monospace: 'code',
		link: 'link',
		url: 'url',
		name: 'key',
		string: 'string',
		string2: 'string',
		number: 'literal',
		bool: 'literal',
		atom: 'literal',
		keyword: 'literal',
		comment: 'comment',
		punctuation: 'punctuation',
		meta: 'punctuation',
		contentSeparator: 'punctuation',
		operator: 'punctuation'
	}
	for (const [token, role] of Object.entries(roles)) {
		expect(css).toMatch(
			new RegExp(`\\.tok-${token}\\b[^{]*\\{[^}]*color:\\s*var\\(--editor-${role},`)
		)
	}
	expect(css).toMatch(/^\.cm-editor\s*\{/)
	expect(css).not.toContain('luzzle-editor')
	expect(css).toContain('--cm-attribute: var(--editor-string,')
	expect(css).toContain('--cm-variable: var(--editor-key,')
	expect(css).toContain('--cm-link: var(--editor-link,')
	expect(css).not.toMatch(/#[\da-f]{3,8}\b/i)
})

test('theme reconfiguration preserves the document, selection, parser and undo history', () => {
	const theme = new Compartment()
	let state = EditorState.create({
		doc: '# Heading',
		extensions: [markdown(), history(), theme.of(configuredTheme('light'))]
	})
	state = state.update({ changes: { from: 9, insert: ' edited' }, selection: { anchor: 4 } }).state
	const tree = syntaxTree(state)

	for (const mode of ['dark', 'light'] as const) {
		state = state.update({ effects: theme.reconfigure(configuredTheme(mode)) }).state
		expect(state.facet(EditorView.darkTheme)).toBe(mode === 'dark')
		expect(state.doc.toString()).toBe('# Heading edited')
		expect(state.selection.main.anchor).toBe(4)
		expect(syntaxTree(state)).toBe(tree)
		expect(highlightingFor(state, [t.heading])).toBeTruthy()
	}

	expect(
		undo({
			state,
			dispatch: (transaction: Transaction) => {
				state = transaction.state
			}
		})
	).toBe(true)
	expect(state.doc.toString()).toBe('# Heading')
})
