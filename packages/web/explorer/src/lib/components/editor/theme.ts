import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { tags as t } from '@lezer/highlight'
import type { EditorThemeColors } from '$lib/server/shiki'

export function createEditorTheme(colors: EditorThemeColors, isDark: boolean): Extension {
	const editorTheme = EditorView.theme(
		{
			'&': {
				color: colors.fg,
				backgroundColor: colors.bg
			},
			'.cm-content': {
				caretColor: colors.cursor
			},
			'.cm-cursor, .cm-dropCursor': {
				borderLeftColor: colors.cursor
			},
			'&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
				{
					backgroundColor: colors.selection + '44' // Add transparency
				},
			'.cm-activeLine': {
				backgroundColor: 'transparent'
			},
			'.cm-gutters': {
				backgroundColor: colors.bg,
				color: colors.comment,
				border: 'none'
			}
		},
		{ dark: isDark }
	)

	const highlightStyle = HighlightStyle.define([
		{ tag: t.comment, color: colors.comment },
		{ tag: t.lineComment, color: colors.comment },
		{ tag: t.blockComment, color: colors.comment },

		{ tag: t.string, color: colors.string },
		{ tag: t.special(t.string), color: colors.string },
		{ tag: t.regexp, color: colors.regexp },
		{ tag: t.escape, color: colors.regexp },

		{ tag: t.number, color: colors.number },
		{ tag: t.integer, color: colors.number },
		{ tag: t.float, color: colors.number },

		{ tag: t.keyword, color: colors.keyword },
		{ tag: t.modifier, color: colors.keyword },
		{ tag: t.controlKeyword, color: colors.keyword },
		{ tag: t.operatorKeyword, color: colors.operator },
		{ tag: t.operator, color: colors.operator },

		{ tag: t.variableName, color: colors.variable },
		{ tag: t.propertyName, color: colors.variable },
		{ tag: t.attributeName, color: colors.attribute },

		{ tag: t.function(t.variableName), color: colors.function },
		{ tag: t.function(t.propertyName), color: colors.function },

		{ tag: t.definition(t.variableName), color: colors.definition },
		{ tag: t.labelName, color: colors.definition },

		{ tag: t.typeName, color: colors.type },
		{ tag: t.className, color: colors.class },
		{ tag: t.tagName, color: colors.tag },

		{ tag: t.constant(t.variableName), color: colors.constant },
		{ tag: t.standard(t.variableName), color: colors.builtin },

		{ tag: t.bracket, color: colors.bracket },
		{ tag: t.brace, color: colors.bracket },
		{ tag: t.separator, color: colors.separator },
		{ tag: t.punctuation, color: colors.separator },

		{ tag: t.heading, color: colors.heading, fontWeight: 'bold' },
		{ tag: t.link, color: colors.link, textDecoration: 'underline' },
		{ tag: t.invalid, color: colors.invalid }
	])

	return [editorTheme, syntaxHighlighting(highlightStyle)]
}
