import { classHighlighter } from '@lezer/highlight'
import { syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { extraClasses } from './token-classes'
import './configured.css'

export function configuredTheme(mode: 'light' | 'dark') {
	return [
		EditorView.darkTheme.of(mode === 'dark'),
		syntaxHighlighting(classHighlighter),
		syntaxHighlighting(extraClasses)
	]
}
