import { tags as t } from '@lezer/highlight'
import { createTheme, type ThemeSettings } from '../create-theme.js'

const settings: ThemeSettings = {
	background: '#282828',
	foreground: '#ebdbb2',
	caret: '#ebdbb2',
	selection: '#b99d555c',
	selectionMatch: '#b99d555c',
	lineHighlight: '#baa1602b',
	gutterBackground: '#282828',
	gutterForeground: '#7c6f64',
	gutterActiveForeground: '#ebdbb2',
	attribute: '#fabd2f',
	variable: '#83a598',
	link: '#7c6f64'
}

const red = '#fb4934'
const green = '#b8bb26'
const yellow = '#fabd2f'
const blue = '#83a598'
const purple = '#d3869b'
const orange = '#fe8019'
const gray = '#928374'

export const gruvboxDark = createTheme('dark', settings, [
	{ tag: t.keyword, color: red },
	{ tag: [t.controlKeyword, t.moduleKeyword, t.modifier, t.operatorKeyword], color: red },

	{ tag: [t.variableName, t.definition(t.variableName)], color: blue },
	{ tag: [t.propertyName, t.standard(t.variableName)], color: green },
	{
		tag: [t.function(t.variableName), t.function(t.propertyName)],
		color: green,
		fontStyle: 'bold'
	},
	{ tag: [t.labelName, t.macroName], color: '#ebdbb2' },

	{ tag: [t.typeName, t.className, t.definition(t.typeName)], color: yellow },
	{ tag: [t.namespace], color: blue, fontStyle: 'italic' },

	{ tag: [t.number, t.changed, t.self, t.constant(t.name), t.bool, t.atom], color: purple },

	{ tag: [t.string, t.processingInstruction, t.inserted], color: green },
	{ tag: [t.special(t.string), t.regexp, t.escape], color: purple },

	{ tag: t.tagName, color: green },
	{ tag: [t.attributeName, t.attributeValue], color: yellow },

	{ tag: [t.operator, t.bracket, t.brace, t.separator, t.punctuation], color: '#ebdbb2' },
	{ tag: t.squareBracket, color: orange },
	{ tag: t.angleBracket, color: blue },

	{ tag: [t.comment, t.lineComment, t.blockComment], color: gray, fontStyle: 'italic' },
	{ tag: [t.docComment, t.meta], color: yellow, fontStyle: 'italic' },

	{ tag: [t.heading, t.heading1, t.heading2], fontWeight: 'bold', color: green },
	{ tag: [t.heading3, t.heading4], fontWeight: 'bold', color: yellow },
	{ tag: [t.heading5, t.heading6], color: yellow },
	{ tag: t.strong, fontWeight: 'bold', color: orange },
	{ tag: t.emphasis, fontStyle: 'italic', color: green },
	{ tag: t.strikethrough, textDecoration: 'line-through' },
	{ tag: t.quote, color: gray },

	{ tag: t.link, color: '#7c6f64', textDecoration: 'underline' },
	{ tag: t.url, color: purple, textDecoration: 'underline' },

	{ tag: t.contentSeparator, color: red },
	{ tag: t.invalid, color: orange }
])

export const gruvboxDarkBg = settings.background
