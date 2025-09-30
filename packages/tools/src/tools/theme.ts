import { loadConfig } from '../sdk.js'
import { generateThemeCss, minifyCss } from './theme/theme.js'
import path from 'path'
import { mkdir, writeFile } from 'fs/promises'

export async function generateTheme(
	configPath: string,
	output?: string,
	minify: boolean = false
) {
	const config = loadConfig({ userConfigPath: configPath })
	const rawCss = generateThemeCss(config)
	const css = minify ? minifyCss(rawCss) : rawCss

	if (output) {
		const outputDir = path.resolve(process.cwd(), output)
		const themeVersion = config.theme.version
		const outputPath = path.join(outputDir, `theme.${themeVersion}.css`)
		await mkdir(outputDir, { recursive: true })
		await writeFile(outputPath, css)
		console.log(`Theme CSS generated at: ${outputPath}`)
	} else {
		console.log(css)
	}
}
