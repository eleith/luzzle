import { createHash } from 'crypto';
import { loadConfig } from '../../lib/config/config.js'
import { generateThemeCss, minifyCss } from './theme.js'
import path from 'path'
import { mkdir, writeFile } from 'fs/promises'

export default async function generateTheme(
	configPath: string,
	output?: string,
	minify: boolean = false
): Promise<string | void> {
	const config = loadConfig(configPath)
	const rawCss = generateThemeCss(config)
	const css = minify ? minifyCss(rawCss) : rawCss

	if (output) {
		const outputDir = path.resolve(process.cwd(), output)
		const hash = createHash('sha256').update(css).digest('hex').slice(0, 8)
		const hashedFileName = `theme.${hash}.css`
		const outputPath = path.join(outputDir, hashedFileName)
		await mkdir(outputDir, { recursive: true })
		await writeFile(outputPath, css)
		return path.relative(path.dirname(configPath), outputPath)
	} else {
		console.log(css)
	}
}
