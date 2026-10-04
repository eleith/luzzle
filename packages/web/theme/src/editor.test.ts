import { beforeEach, describe, expect, test, vi } from 'vitest'
import { generateEditorThemeCss } from './editor.js'

const fixtures = vi.hoisted(() => ({
	light: {} as Record<string, unknown>,
	dark: {} as Record<string, unknown>,
}))
vi.mock('@shikijs/themes', () => ({ themeNames: ['github-light-default', 'github-dark-default'] }))
vi.mock('@shikijs/themes/github-light-default', () => ({ get default() { return fixtures.light } }))
vi.mock('@shikijs/themes/github-dark-default', () => ({ get default() { return fixtures.dark } }))

const names = { light: 'github-light-default', dark: 'github-dark-default' }

beforeEach(() => {
	fixtures.light = { name: names.light, bg: '#fff', fg: '#222' }
	fixtures.dark = { name: names.dark, bg: '#111', fg: '#eee' }
})

async function lightVariables() {
	const css = await generateEditorThemeCss(names)
	const firstBlock = css.slice(0, css.indexOf('}'))
	return Object.fromEntries(
		[...firstBlock.matchAll(/--editor-([\w-]+): ([^;]+);/g)].map((match) => [match[1], match[2]])
	)
}

describe('generateEditorThemeCss', () => {
	test('emits default, explicit light/dark and system preference selectors', async () => {
		const css = await generateEditorThemeCss(names)
		expect(css).toContain(":root, :root[data-theme='light'], section[data-theme='light']")
		expect(css).toContain(":root[data-theme='dark'], section[data-theme='dark']")
		expect(css).toContain('@media (prefers-color-scheme: dark)')
		expect(css).toContain(":root:not([data-theme='light'])")
		expect(css.match(/--editor-background: #fff;/g)).toHaveLength(1)
		expect(css.match(/--editor-background: #111;/g)).toHaveLength(2)
	})

	test('uses supplied editor chrome instead of inventing another palette', async () => {
		fixtures.light.colors = {
			'editor.background': '#fafafa', 'editor.foreground': '#333',
			'editorCursor.foreground': '#123', 'editor.selectionBackground': '#abc',
			'editor.selectionHighlightBackground': '#bcd', 'editor.lineHighlightBackground': '#def',
			'editorGutter.background': '#eee', 'editorLineNumber.foreground': '#777',
			'editorLineNumber.activeForeground': '#555', 'editorWidget.background': '#ddd',
			'editorWidget.foreground': '#444', 'editorWidget.border': '#ccc',
		}
		expect(await lightVariables()).toMatchObject({
			background: '#fafafa', foreground: '#333', caret: '#123', selection: '#abc',
			selectionMatch: '#bcd', lineHighlight: '#def', gutterBackground: '#eee',
			gutterForeground: '#777', gutterActiveForeground: '#555', panelBackground: '#ddd',
			panelForeground: '#444', border: '#ccc',
		})
	})

	test('uses shared selection and group border when editor-specific colors are missing', async () => {
		fixtures.light.colors = { 'selection.background': '#abc', 'editorGroup.border': '#777' }
		expect(await lightVariables()).toMatchObject({ selection: '#abc', border: '#777' })
	})

	test('uses the theme-wide foreground when no editor or token foreground is provided', async () => {
		fixtures.light = { name: 'theme-wide', colors: { 'editor.background': '#fff', foreground: '#444' } }
		expect(await lightVariables()).toMatchObject({ foreground: '#444', string: '#444' })
	})

	test('derives missing chrome and syntax values from the theme foreground/background', async () => {
		const variables = await lightVariables()
		expect(variables).toMatchObject({
			background: '#fff', foreground: '#222', caret: '#222',
			selection: 'color-mix(in srgb, #222 20%, #fff)',
			lineHighlight: 'color-mix(in srgb, #222 6%, #fff)',
			gutterBackground: '#fff', gutterForeground: '#222', gutterActiveForeground: '#222',
			panelBackground: '#fff', panelForeground: '#222',
			border: 'color-mix(in srgb, #222 20%, #fff)',
		})
		for (const role of ['heading', 'strong', 'emphasis', 'quote', 'code', 'link', 'url', 'key', 'string', 'literal', 'comment', 'punctuation']) {
			expect(variables[role]).toBe('#222')
		}
	})

	test('accepts arrays, comma-separated scopes, and scope-prefix matching', async () => {
		fixtures.light.tokenColors = [
			{ scope: [' comment, string ', 'markup.heading'], settings: { foreground: '#123' } },
		]
		expect(await lightVariables()).toMatchObject({ comment: '#123', string: '#123', heading: '#123' })
	})

	test('prefers specificity over order, using later rules to break ties', async () => {
		fixtures.light.tokenColors = [
			{ scope: 'string.quoted', settings: { foreground: '#111' } },
			{ scope: 'string.quoted.double.yaml', settings: { foreground: '#333' } },
			{ scope: 'string', settings: { foreground: '#222' } },
			{ scope: 'string.quoted.double.yaml', settings: { foreground: '#444' } },
		]
		expect((await lightVariables()).string).toBe('#444')
	})

	test('uses alternate canonical scopes when the primary scope has no match', async () => {
		fixtures.light.tokenColors = [
			{ scope: 'markup.raw', settings: { foreground: '#123' } },
			{ scope: 'string.other.link', settings: { foreground: '#456' } },
		]
		expect(await lightVariables()).toMatchObject({ code: '#123', url: '#456' })
	})

	test('ignores partial prefixes, contextual selectors, wildcards and colorless rules', async () => {
		fixtures.light.tokenColors = [
			{ scope: 'str', settings: { foreground: '#bad' } },
			{ scope: 'heading.1.markdown entity.name.section.markdown', settings: { foreground: '#bad' } },
			{ scope: 'markup.*', settings: { foreground: '#bad' } },
			{ scope: 'markup.italic', settings: { fontStyle: 'italic' } },
			{ scope: 'string' },
			{},
		]
		expect(await lightVariables()).toMatchObject({ string: '#222', heading: '#222', emphasis: '#222' })
	})

	test('accepts legacy settings and the last unscoped foreground', async () => {
		fixtures.light = { name: 'legacy', bg: '#fff', settings: [
			{ settings: { foreground: '#111' } },
			{ settings: { foreground: '#444' } },
			{ scope: 'comment', settings: { foreground: '#777' } },
		] }
		expect(await lightVariables()).toMatchObject({ foreground: '#444', comment: '#777' })
	})

	test.each(['light', 'dark'] as const)('rejects an unknown %s theme before importing it', async (mode) => {
		await expect(generateEditorThemeCss({ ...names, [mode]: '../not-a-theme' }))
			.rejects.toThrow('Unknown editor theme: ../not-a-theme')
	})

	test.each([{ fg: '#222' }, { bg: '#fff' }, { tokenColors: [{ settings: {} }] }])(
		'rejects missing base colors: %j', async (properties) => {
			fixtures.light = { name: 'incomplete', ...properties }
			await expect(generateEditorThemeCss(names)).rejects.toThrow('needs a background and foreground')
		}
	)

	test('does not mutate loaded theme definitions', async () => {
		fixtures.light.tokenColors = [{ scope: 'comment', settings: { foreground: '#777' } }]
		const original = structuredClone(fixtures.light)
		await generateEditorThemeCss(names)
		expect(fixtures.light).toEqual(original)
	})
})
