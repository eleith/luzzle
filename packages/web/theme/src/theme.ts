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

// A family stack selects fonts; @font-face and Takumi each register one family.
export function fontFaceName(config: Config, role: 'sans' | 'mono'): string {
	const bundled = role === 'sans' ? 'Noto Sans' : 'Noto Sans Mono'
	const filename = role === 'sans' ? 'noto-sans.woff2' : 'noto-sans-mono.woff2'
	const globals = config.theme.globals
	const url = globals?.[`font-${role}-url`]?.replace(/^['"]|['"]$/g, '')
	if (!config.content?.fonts?.[role] && (!url || url === `/fonts/${filename}`)) return bundled

	const stack = globals?.[`font-${role}-name`]?.trim() ?? ''
	const first = stack.match(/^(?:"([^"]+)"|'([^']+)'|([^,]+))/)
	return first?.[1] ?? first?.[2] ?? first?.[3]?.trim() ?? bundled
}

export function generateThemeCss(config: Config): string {
	const themeConfig = config.theme
	if (!themeConfig) {
		return ''
	}

	const globals = { ...themeConfig.globals }
	for (const family of ['sans', 'mono'] as const) {
		const filename = config.content?.fonts?.[family]
		if (filename) globals[`font-${family}-url`] = JSON.stringify(configuredAssetUrl('fonts', filename))
	}

	const globalsBlock = createCssVariableBlock(globals as Record<string, unknown>).join('\n')
	const lightBlock = createCssVariableBlock((themeConfig.light || {}) as Record<string, unknown>).join('\n')
	const darkBlock = createCssVariableBlock((themeConfig.dark || {}) as Record<string, unknown>).join('\n')
	const markdownBlock = createCssVariableBlock((themeConfig.markdown || {}) as Record<string, unknown>).join('\n')

	const fontSansName = JSON.stringify(fontFaceName(config, 'sans'))
	const fontSansWeight = globals['font-sans-weight'] || '100 900'
	const fontSansUrl = globals['font-sans-url'] || '"/fonts/noto-sans.woff2"'

	const fontMonoName = JSON.stringify(fontFaceName(config, 'mono'))
	const fontMonoWeight = globals['font-mono-weight'] || '400'
	const fontMonoUrl = globals['font-mono-url'] || '"/fonts/noto-sans-mono.woff2"'

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
	font-family: ${fontMonoName};
	font-weight: ${fontMonoWeight};
	src: url(${fontMonoUrl}) format('woff2');
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

:where(pre, code, kbd, samp) {
	font-family: var(--font-mono-name), monospace;
}

@media (prefers-color-scheme: dark) {
	:root:not([data-theme='light']) {
${darkBlock}
	}
}
`
}
