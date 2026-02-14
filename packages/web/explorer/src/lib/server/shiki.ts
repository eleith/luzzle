import { createHighlighter, type ThemeInput } from 'shiki'

export interface EditorThemeColors {
	bg: string
	fg: string
	cursor: string
	selection: string
	activeLine: string

	comment: string
	keyword: string
	string: string
	number: string
	regexp: string
	definition: string
	variable: string
	parameter: string
	function: string
	builtin: string
	constant: string
	class: string
	type: string
	tag: string
	attribute: string
	operator: string
	bracket: string
	separator: string
	heading: string
	link: string
	invalid: string
}

const DEFAULT_COLOR = '#888888'

// Use globalThis to persist the singleton across Vite HMR
const globalForShiki = globalThis as unknown as {
	shikiHighlighter: Awaited<ReturnType<typeof createHighlighter>> | null
}

async function getHighlighter(themes: string[]) {
	if (!globalForShiki.shikiHighlighter) {
		globalForShiki.shikiHighlighter = await createHighlighter({
			themes: themes as ThemeInput[],
			langs: ['javascript']
		})
	} else {
		await globalForShiki.shikiHighlighter.loadTheme(...(themes as ThemeInput[]))
	}
	return globalForShiki.shikiHighlighter
}
export async function extractEditorTheme(
	themeName: string,
	type: 'light' | 'dark'
): Promise<EditorThemeColors> {
	const highlighter = await getHighlighter([themeName])

	const theme = highlighter.getTheme(themeName)
	const settings = theme.settings || theme.tokenColors || []

	const colors: Partial<EditorThemeColors> = {
		bg: theme.bg || (type === 'dark' ? '#1e1e1e' : '#ffffff'),
		fg: theme.fg || (type === 'dark' ? '#d4d4d4' : '#000000'),
		cursor: theme.fg || (type === 'dark' ? '#aeafad' : '#000000'),
		selection: type === 'dark' ? '#264f78' : '#add6ff',
		activeLine: type === 'dark' ? '#2c313a' : '#f0f0f0'
	}

	function findColor(scopes: string[]): string | undefined {
		for (const scopeToCheck of scopes) {
			for (const setting of settings) {
				if (!setting.scope) continue

				const settingScopes = Array.isArray(setting.scope) ? setting.scope : [setting.scope]

				for (const s of settingScopes) {
					if (s === scopeToCheck || s.startsWith(scopeToCheck + '.')) {
						if (setting.settings.foreground) {
							return setting.settings.foreground
						}
					}
				}
			}
		}
		return undefined
	}

	colors.comment = findColor(['comment', 'punctuation.definition.comment'])
	colors.keyword = findColor(['keyword', 'storage'])
	colors.string = findColor(['string'])
	colors.number = findColor(['constant.numeric'])
	colors.regexp = findColor(['string.regexp'])
	colors.definition = findColor(['entity.name', 'variable.definition'])
	colors.variable = findColor(['variable', 'meta.object-literal.key'])
	colors.parameter = findColor(['variable.parameter'])
	colors.function = findColor(['entity.name.function', 'support.function'])
	colors.builtin = findColor(['support.class', 'support.type', 'support.constant'])
	colors.constant = findColor(['constant', 'variable.other.constant'])
	colors.class = findColor(['entity.name.type', 'entity.name.class'])
	colors.type = findColor(['entity.name.type', 'support.type'])
	colors.tag = findColor(['entity.name.tag'])
	colors.attribute = findColor(['entity.other.attribute-name'])
	colors.operator = findColor(['keyword.operator'])
	colors.bracket = findColor(['punctuation.section', 'meta.brace'])
	colors.separator = findColor(['punctuation.separator'])
	colors.heading = findColor(['markup.heading', 'entity.name.section'])
	colors.link = findColor(['markup.underline.link', 'string.other.link'])
	colors.invalid = findColor(['invalid'])

	const finalColors = { ...colors } as EditorThemeColors
	for (const key in finalColors) {
		if (!finalColors[key as keyof EditorThemeColors]) {
			finalColors[key as keyof EditorThemeColors] = finalColors.fg || DEFAULT_COLOR
		}
	}

	return finalColors
}
