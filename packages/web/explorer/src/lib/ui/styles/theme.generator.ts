import { config } from '$lib/server/config'

const createCssVariableBlock = (variables: Record<string, string>): string => {
	return Object.entries(variables)
		.map(([key, value]) => `	--${key}: ${value};`)
		.join('\n')
}

export const generateThemeCss = (): string => {
	const themeConfig = config.theme || {}

	const globalsBlock = createCssVariableBlock(themeConfig.globals || {})
	const lightBlock = createCssVariableBlock(themeConfig.light || {})
	const darkBlock = createCssVariableBlock(themeConfig.dark || {})
	const cssTemplate = `
html {
${globalsBlock}
}

html[data-theme='light'] {
${lightBlock}
}

html[data-theme='dark'] {
${darkBlock}
}

@media (prefers-color-scheme: dark) {
	html:not([data-theme='light']) {
${darkBlock}
	}
}
`

	return cssTemplate
}
