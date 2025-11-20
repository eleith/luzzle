import { loadConfig } from '@luzzle/web.utils/server'
import { generateThemeCss, minifyCss } from './theme.js'

export default async function generateTheme(
	configPath: string,
	minify: boolean = false
): Promise<void> {
	const config = loadConfig(configPath)
	const rawCss = generateThemeCss(config)
	const css = minify ? minifyCss(rawCss) : rawCss

	console.log(css)
}
