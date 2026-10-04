import type { Config } from '@luzzle/web.config'
import { themeNames } from '@shikijs/themes'

type Rule = { scope?: string | string[]; settings?: { foreground?: string } }
type Theme = {
	name: string
	fg?: string
	bg?: string
	colors?: Record<string, string>
	tokenColors?: Rule[]
	settings?: Rule[]
}

/** Build-side only: project configured Shiki colors without shipping a tokenizer. */
export async function generateEditorThemeCss(themes: Config['theme']['markdown']['code']): Promise<string> {
	const light = await loadTheme(themes.light)
	const dark = await loadTheme(themes.dark)
	const lightCss = themeVariables(light)
	const darkCss = themeVariables(dark)
	return `
:root, :root[data-theme='light'], section[data-theme='light'] {
${lightCss}
}
:root[data-theme='dark'], section[data-theme='dark'] {
${darkCss}
}
@media (prefers-color-scheme: dark) {
	:root:not([data-theme='light']) {
${darkCss}
	}
}
`
}

async function loadTheme(name: string): Promise<Theme> {
	if (!themeNames.includes(name)) throw new Error(`Unknown editor theme: ${name}`)
	const theme = await import(`@shikijs/themes/${name}`)
	return theme.default
}

// Canonical Markdown/YAML scopes, in fallback order. Not a TextMate selector engine.
const roles = {
	heading: ['markup.heading.markdown', 'entity.name.section.markdown'],
	strong: ['markup.bold.markdown', 'strong'],
	emphasis: ['markup.italic.markdown', 'emphasis'],
	quote: ['markup.quote.markdown', 'markup.punctuation.quote.beginning.markdown'],
	code: ['markup.inline.raw.markdown', 'markup.raw.inline.markdown', 'markup.fenced_code.block.markdown'],
	link: ['string.other.link.title.markdown', 'markup.underline.link.markdown'],
	url: ['markup.underline.link.markdown', 'string.other.link.markdown'],
	key: ['entity.name.tag.yaml', 'support.type.property-name.yaml'],
	string: ['string.quoted.double.yaml', 'string.unquoted.plain.out.yaml', 'string'],
	literal: ['constant.numeric.yaml', 'constant.language.yaml'],
	comment: ['comment.line.number-sign.yaml', 'comment.block.html'],
	punctuation: ['punctuation'],
}

function findColor(rules: Rule[], candidates: string[]): string | undefined {
	for (const candidate of candidates) {
		let color: string | undefined
		let specificity = 0
		for (const rule of rules) {
			if (!rule.settings?.foreground) continue
			const entries = Array.isArray(rule.scope) ? rule.scope : [rule.scope ?? '']
			const scopes = entries.flatMap((entry) => entry.split(',')).map((entry) => entry.trim())
			for (const scope of scopes) {
				if (!/^[\w-]+(?:\.[\w-]+)*$/.test(scope)) continue
				if (candidate !== scope && !candidate.startsWith(`${scope}.`)) continue
				// More-specific scopes win; later rules break ties.
				if (scope.length >= specificity) {
					color = rule.settings.foreground
					specificity = scope.length
				}
			}
		}
		if (color) return color
	}
	return undefined
}

function themeVariables(theme: Theme): string {
	const colors = theme.colors ?? {}
	const rules = theme.tokenColors ?? theme.settings ?? []
	let defaultForeground = theme.fg
	for (const rule of rules) {
		if (!rule.scope && rule.settings?.foreground) defaultForeground = rule.settings.foreground
	}
	const background = colors['editor.background'] ?? theme.bg
	const foreground = colors['editor.foreground'] ?? defaultForeground ?? colors.foreground
	if (!background || !foreground) throw new Error(`Theme ${theme.name} needs a background and foreground.`)

	const syntax: Record<string, string> = {}
	for (const [role, candidates] of Object.entries(roles)) {
		syntax[role] = findColor(rules, candidates) ?? foreground
	}
	const caret = colors['editorCursor.foreground'] ?? foreground
	const selection = colors['editor.selectionBackground'] ?? colors['selection.background']
		?? `color-mix(in srgb, ${caret} 20%, ${background})`
	const chrome = {
		background,
		foreground,
		caret,
		selection,
		selectionMatch: colors['editor.selectionHighlightBackground'] ?? selection,
		lineHighlight: colors['editor.lineHighlightBackground']
			?? `color-mix(in srgb, ${foreground} 6%, ${background})`,
		gutterBackground: colors['editorGutter.background'] ?? background,
		gutterForeground: colors['editorLineNumber.foreground'] ?? syntax.comment,
		gutterActiveForeground: colors['editorLineNumber.activeForeground'] ?? foreground,
		panelBackground: colors['editorWidget.background'] ?? background,
		panelForeground: colors['editorWidget.foreground'] ?? foreground,
		border: colors['editorWidget.border'] ?? colors['editorGroup.border']
			?? `color-mix(in srgb, ${foreground} 20%, ${background})`,
	}
	return Object.entries({ ...chrome, ...syntax })
		.map(([name, value]) => `\t--editor-${name}: ${value};`)
		.join('\n')
}
