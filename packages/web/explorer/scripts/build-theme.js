import { loadConfig } from '@luzzle/web.config'
import path from 'path'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'

function createCssVariableBlock(variables) {
	return Object.keys(variables).flatMap((key) => {
		const value = variables[key]
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			return createCssVariableBlock(value)
		} else {
			return `	--${key}: ${value};`
		}
	})
}

export function generateThemeCss(config) {
	const themeConfig = config.theme
	if (!themeConfig) {
		return ''
	}

	const globalsBlock = createCssVariableBlock(themeConfig.globals || {}).join('\n')
	const lightBlock = createCssVariableBlock(themeConfig.light || {}).join('\n')
	const darkBlock = createCssVariableBlock(themeConfig.dark || {}).join('\n')
	const markdownBlock = createCssVariableBlock(themeConfig.markdown || {}).join('\n')

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

function resolveConfigPath(configPath) {
	const resolved = configPath
		? path.resolve(configPath)
		: path.resolve(process.cwd(), 'config.yaml')
	if (!existsSync(resolved)) {
		throw new Error(
			`Config file not found at ${resolved}. Provide a path argument or create a config.yaml in the current directory.`
		)
	}
	return resolved
}

const isEntrypoint =
	process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])

if (isEntrypoint) {
	try {
		const configPath = resolveConfigPath(process.argv[2])
		const config = loadConfig(configPath)
		process.stdout.write(generateThemeCss(config))
	} catch (err) {
		console.error(err instanceof Error ? err.message : err)
		process.exit(1)
	}
}
