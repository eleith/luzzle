import { type Config } from '@luzzle/web.config'

const createCssVariableBlock = (variables: Record<string, unknown>): string[] => {
	return Object.keys(variables).flatMap((key): string | string[] => {
		const value = variables[key]
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			return createCssVariableBlock(value as Record<string, unknown>)
		} else {
			return `	--${key}: ${value};`
		}
	})
}

const generateThemeCss = (config: Config) => {
	const themeConfig = config.theme
	if (!themeConfig) {
		return ''
	}

	const globalsBlock = createCssVariableBlock((themeConfig.globals || {}) as Record<string, unknown>).join('\n')
	const lightBlock = createCssVariableBlock((themeConfig.light || {}) as Record<string, unknown>).join('\n')
	const darkBlock = createCssVariableBlock((themeConfig.dark || {}) as Record<string, unknown>).join('\n')
	const markdownBlock = createCssVariableBlock((themeConfig.markdown || {}) as Record<string, unknown>).join('\n')

	const fontSansName = themeConfig.globals?.['font-sans-name'] || '"Noto Sans"'
	const fontSansWeight = themeConfig.globals?.['font-sans-weight'] || '300 600'
	const fontSansUrl = themeConfig.globals?.['font-sans-url'] || '"/fonts/noto-sans.woff2"'

	return `
:root {
${globalsBlock}
${markdownBlock}
${lightBlock}
}

:root[data-theme='dark'],
section[data-theme='dark'] {
${darkBlock}
}

@font-face {
	font-family: ${fontSansName};
	font-optical-sizing: auto;
	font-weight: ${fontSansWeight};
	font-style: normal;
	font-variation-settings: 'wdth' 300;
	src: url(${fontSansUrl}) format('woff2');
	font-display: swap;
}

@font-face {
	font-family: 'Adjusted Sans';
	src: local(Dejavu Sans), local(Verdana), sans-serif;
	size-adjust: 92%;
}

:root {
	font-family: var(--font-sans-name), 'Adjusted Sans';
	font-size: calc(var(--font-size-root) * 1px);
}

@media (prefers-color-scheme: dark) {
	:root:not([data-theme='light']) {
${darkBlock}
	}
}
`
}

export { generateThemeCss }
