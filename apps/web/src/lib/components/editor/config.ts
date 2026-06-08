import {
	EditorView,
	highlightSpecialChars,
	drawSelection,
	dropCursor,
	rectangularSelection,
	crosshairCursor,
	highlightActiveLine,
	keymap,
	ViewUpdate
} from '@codemirror/view'
import { EditorState, Compartment, type Extension } from '@codemirror/state'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import { markdown } from '@codemirror/lang-markdown'
import { yamlFrontmatter } from '@codemirror/lang-yaml'
import { indentWithTab } from '@codemirror/commands'
import { lintGutter, lintKeymap } from '@codemirror/lint'
import { luzzleHyperlink } from './extensions/luzzleHyperlink'
import { luzzleMarkdownLink } from './extensions/luzzleMarkdownLink'
import { backLinkConfig } from './extensions/backLinkConfig'

export interface EditorConfigOptions {
	themeConfig: Compartment
	initialTheme?: Extension
	onUpdate?: (update: ViewUpdate) => void
	returnTo?: string
}

export function createEditorExtensions({
	themeConfig,
	initialTheme,
	onUpdate,
	returnTo
}: EditorConfigOptions) {
	const extensions = [
		highlightSpecialChars(),
		history(),
		drawSelection(),
		dropCursor(),
		EditorState.allowMultipleSelections.of(true),
		indentOnInput(),
		bracketMatching(),
		closeBrackets(),

		rectangularSelection(),
		crosshairCursor(),
		highlightActiveLine(),
		highlightSelectionMatches(),

		keymap.of([
			indentWithTab,
			...closeBracketsKeymap,
			...defaultKeymap,
			...searchKeymap,
			...historyKeymap,
			...completionKeymap,
			...lintKeymap
		]),

		EditorView.lineWrapping,
		yamlFrontmatter({
			content: markdown()
		}),

		themeConfig.of(initialTheme ?? []),
		lintGutter({ tooltipFilter: () => [] }),
		luzzleHyperlink,
		luzzleMarkdownLink,
		backLinkConfig.of(returnTo || ''),

		EditorView.theme({
			'&': {
				height: '100%',
				fontSize: 'var(--font-size-xs)'
			},
			'.cm-content': {
				padding: 'var(--space-4)'
			}
		})
	]

	if (onUpdate) {
		extensions.push(EditorView.updateListener.of(onUpdate))
	}

	return extensions
}
