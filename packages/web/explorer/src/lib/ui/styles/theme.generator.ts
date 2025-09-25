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

@font-face {
	font-family: var(--font-sans);
	font-optical-sizing: auto;
	font-weight: var(--font-sans-weight);
	font-style: normal;
	font-variation-settings: 'wdth' 300;
	src: url("${config.theme.globals['font-sans-url']}") format('woff2');
	font-display: swap;
}

@font-face {
	font-family: 'Adjusted Sans';
	src: local(Dejavu Sans), local(Verdana), sans-serif;
	size-adjust: 92%;
}

html {
	font-family: var(--font-sans), 'Adjusted Sans';
}

@media (prefers-color-scheme: dark) {
	html:not([data-theme='light']) {
${darkBlock}
	}
}
`

	return cssTemplate
}
