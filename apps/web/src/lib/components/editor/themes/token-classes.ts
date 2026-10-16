import { tagHighlighter, tags as t } from '@lezer/highlight'

// Supplement the standard token classes with the Markdown roles it omits.
export const extraClasses = tagHighlighter([
	{ tag: t.quote, class: 'tok-quote' },
	{ tag: t.monospace, class: 'tok-monospace' },
	{ tag: t.strikethrough, class: 'tok-strikethrough' },
	{ tag: t.contentSeparator, class: 'tok-contentSeparator' },
	{ tag: t.name, class: 'tok-name' }
])
