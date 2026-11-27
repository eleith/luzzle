import { fontFaceName } from '@luzzle/web.theme'
import { readConfiguredAsset } from '@luzzle/web.config/assets'
import type { TemplateConfig } from '@luzzle/web.templates/config'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const bundledFonts = {
	sans: { file: 'noto-sans.woff2', generic: 'sans-serif' },
	mono: { file: 'noto-sans-mono.woff2', generic: 'monospace' },
} as const

async function loadFont(config: TemplateConfig, role: keyof typeof bundledFonts) {
	const bundled = bundledFonts[role]
	const globals = config.theme.globals
	const name = fontFaceName(config, role)
	const source = config.content.fonts[role]
	if (source) {
		const data = await readConfiguredAsset(config, source)
		if (data) return { name, generic: bundled.generic, data: Buffer.from(data) }
	} else {
		const defaultUrl = `/fonts/${bundled.file}`
		const url = globals[`font-${role}-url`]?.replace(/['"]/g, '') || defaultUrl
		const staticDir = path.resolve(path.dirname(config.paths.config ?? ''), config.paths.static)
		const staticFile = path.join(staticDir, url)
		if (existsSync(staticFile)) return { name, generic: bundled.generic, data: readFileSync(staticFile) }
		if (url === defaultUrl) {
			const file = new URL(import.meta.resolve(`#bundled-fonts/${bundled.file}`))
			return { name, generic: bundled.generic, data: readFileSync(file) }
		}
	}
	console.warn(`[render] Configured ${role} font unavailable. Takumi will use default fonts.`)
	return undefined
}

export async function loadOpengraphFonts(config: TemplateConfig) {
	const fonts = await Promise.all([loadFont(config, 'sans'), loadFont(config, 'mono')])
	return fonts.filter(font => font !== undefined)
}
