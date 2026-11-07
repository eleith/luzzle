import type { Config } from '@luzzle/web.config'
import { configuredAssetUrl } from '@luzzle/web.config/asset-urls'

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

export function generateThemeCss(config: Config): string {
	const themeConfig = config.theme
	if (!themeConfig) {
		return ''
	}

	const globals = { ...themeConfig.globals }
	if (config.content?.fonts?.sans)
		globals['font-sans-url'] = JSON.stringify(
			configuredAssetUrl('fonts', config.content.fonts.sans)
		)

	const globalsBlock = createCssVariableBlock(globals as Record<string, unknown>).join('\n')
	const lightBlock = createCssVariableBlock((themeConfig.light || {}) as Record<string, unknown>).join('\n')
	const darkBlock = createCssVariableBlock((themeConfig.dark || {}) as Record<string, unknown>).join('\n')
	const markdownBlock = createCssVariableBlock((themeConfig.markdown || {}) as Record<string, unknown>).join('\n')

	const fontSansName = globals['font-sans-name'] || '"Noto Sans"'
	const fontSansWeight = globals['font-sans-weight'] || '300 600'
	const fontSansUrl = globals['font-sans-url'] || '"/fonts/noto-sans.woff2"'

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
}

@media (prefers-color-scheme: dark) {
	:root:not([data-theme='light']) {
${darkBlock}
	}
}
`
}
