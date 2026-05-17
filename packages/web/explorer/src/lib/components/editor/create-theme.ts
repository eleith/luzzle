import { type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { HighlightStyle, type TagStyle, syntaxHighlighting } from '@codemirror/language'

export interface ThemeSettings {
	background: string
	foreground: string
	caret: string
	selection: string
	selectionMatch?: string
	lineHighlight: string
	gutterBackground: string
	gutterForeground: string
	gutterActiveForeground?: string
	/** CSS var --cm-attribute, used by yamlAssetWidget / linkDetector */
	attribute?: string
	/** CSS var --cm-variable, used by yamlKeyWidget */
	variable?: string
	/** CSS var --cm-link */
	link?: string
}

export function createTheme(
	theme: 'light' | 'dark',
	settings: ThemeSettings,
	styles: TagStyle[]
): Extension {
	const baseStyles: Record<string, string> = {
		color: settings.foreground,
		backgroundColor: settings.background
	}
	if (settings.attribute) baseStyles['--cm-attribute'] = settings.attribute
	if (settings.variable) baseStyles['--cm-variable'] = settings.variable
	if (settings.link) baseStyles['--cm-link'] = settings.link

	const s: Record<string, Record<string, string>> = {
		'&': baseStyles,
		'.cm-content': {
			caretColor: settings.caret
		},
		'.cm-cursor, .cm-dropCursor': {
			borderLeftColor: settings.caret
		},
		'.cm-gutters': {
			backgroundColor: settings.gutterBackground,
			color: settings.gutterForeground,
			borderRightColor: 'transparent'
		},
		'.cm-activeLine': {
			backgroundColor: settings.lineHighlight
		},
		'.cm-activeLineGutter': {
			backgroundColor: settings.lineHighlight,
			color: settings.gutterActiveForeground ?? settings.foreground
		},
		['&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground,' +
		' .cm-selectionBackground,' +
		' .cm-content ::selection']: {
			backgroundColor: settings.selection
		}
	}

	if (settings.selectionMatch) {
		s['.cm-selectionMatch'] = { backgroundColor: settings.selectionMatch }
	}

	return [
		EditorView.theme(s, { dark: theme === 'dark' }),
		syntaxHighlighting(HighlightStyle.define(styles))
	]
}
