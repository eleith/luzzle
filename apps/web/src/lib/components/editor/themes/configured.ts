import { classHighlighter, tagHighlighter, tags as t } from '@lezer/highlight'
import { syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import './configured.css'

// Supplement the standard token classes with the Markdown roles it omits.
const extraClasses = tagHighlighter([
	{ tag: t.quote, class: 'tok-quote' },
	{ tag: t.monospace, class: 'tok-monospace' },
	{ tag: t.strikethrough, class: 'tok-strikethrough' },
	{ tag: t.contentSeparator, class: 'tok-contentSeparator' },
	{ tag: t.name, class: 'tok-name' }
])

export function configuredTheme(mode: 'light' | 'dark') {
	return [
		EditorView.darkTheme.of(mode === 'dark'),
		syntaxHighlighting(classHighlighter),
		syntaxHighlighting(extraClasses)
	]
}
