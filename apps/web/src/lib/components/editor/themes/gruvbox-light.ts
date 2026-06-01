import { tags as t } from '@lezer/highlight'
import { createTheme, type ThemeSettings } from '../create-theme.js'

const settings: ThemeSettings = {
	background: '#fbf1c7',
	foreground: '#3c3836',
	caret: '#af3a03',
	selection: '#bdae9391',
	selectionMatch: '#bdae9391',
	lineHighlight: '#a37f2238',
	gutterBackground: '#ebdbb2',
	gutterForeground: '#665c54',
	gutterActiveForeground: '#3c3836',
	attribute: '#b57614',
	variable: '#076678',
	link: '#7c6f64'
}

const red = '#9d0006'
const green = '#79740e'
const yellow = '#b57614'
const blue = '#076678'
const purple = '#8f3f71'
const orange = '#af3a03'
const gray = '#928374'

export const gruvboxLight = createTheme('light', settings, [
	{ tag: t.keyword, color: red },
	{ tag: [t.controlKeyword, t.moduleKeyword, t.modifier, t.operatorKeyword], color: red },

	{ tag: [t.variableName, t.definition(t.variableName)], color: blue },
	{ tag: [t.propertyName, t.standard(t.variableName)], color: green },
	{
		tag: [t.function(t.variableName), t.function(t.propertyName)],
		color: green,
		fontStyle: 'bold'
	},
	{ tag: [t.labelName, t.macroName], color: '#3c3836' },

	{ tag: [t.typeName, t.className, t.definition(t.typeName)], color: yellow },
	{ tag: [t.namespace], color: blue, fontStyle: 'italic' },

	{ tag: [t.number, t.changed, t.self, t.constant(t.name), t.bool, t.atom], color: purple },

	{ tag: [t.string, t.processingInstruction, t.inserted], color: green },
	{ tag: [t.special(t.string), t.regexp, t.escape], color: purple },

	{ tag: t.tagName, color: green },
	{ tag: [t.attributeName, t.attributeValue], color: yellow },

	{ tag: [t.operator, t.bracket, t.brace, t.separator, t.punctuation], color: '#3c3836' },
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

export const gruvboxLightBg = settings.background
