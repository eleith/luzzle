import { generateThemeCss, minifyCss } from './theme.js'
import { type Config } from '@luzzle/web.utils'

export default async function generateTheme(
	config: Config,
	minify: boolean = false
): Promise<void> {
	const rawCss = generateThemeCss(config)
	const css = minify ? minifyCss(rawCss) : rawCss

	console.log(css)
}
