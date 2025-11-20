import { type Config } from '@luzzle/web.utils'
import { transform } from 'lightningcss'
import { Buffer } from 'buffer'

const createCssVariableBlock = (variables: Record<string, unknown>) => {
	return Object.keys(variables).map((key): string | string[] => {
		const value = variables[key]
		if (typeof value === 'object') {
			return createCssVariableBlock(value as Record<string, unknown>).join('\n')
		} else {
			return `	--${key}: ${value};`
		}
	})
}

function minifyCss(css: string): string {
	try {
		const { code } = transform({
			filename: 'theme.css',
			code: Buffer.from(css),
			minify: true,
		})
		return code.toString()
	} catch (error) {
		console.error('Error minifying CSS with Lightning CSS:', error)
		return css
	}
}

const generateThemeCss = (config: Config) => {
	const themeConfig = config.theme

	const globalsBlock = createCssVariableBlock(themeConfig.globals).join('\n')
	const lightBlock = createCssVariableBlock(themeConfig.light).join('\n')
	const darkBlock = createCssVariableBlock(themeConfig.dark).join('\n')
	const markdownBlock = createCssVariableBlock(themeConfig.markdown).join('\n')
	return `
html {
${globalsBlock}
${markdownBlock}
}

html[data-theme='light'] {
${lightBlock}
}

html[data-theme='dark'] {
${darkBlock}
}

@font-face {
	font-family: "${config.theme.globals['font-sans-name']}";
	font-optical-sizing: auto;
	font-weight: ${config.theme.globals['font-sans-weight']};
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
	font-family: var(--font-sans-name), 'Adjusted Sans';
}

@media (prefers-color-scheme: dark) {
	html:not([data-theme='light']) {
${darkBlock}
	}
}
`
}

export { generateThemeCss, minifyCss }
