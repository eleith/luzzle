import { generateThemeCss } from './theme.js'
import { type Config } from '@luzzle/web.config'

export default async function generateTheme(
	config: Config
): Promise<void> {
	const css = generateThemeCss(config)
	console.log(css)
}
