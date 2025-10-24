import { readFile, writeFile } from 'fs/promises'
import { Component } from 'svelte'
import { compile } from 'svelte/compiler'
import path from 'path'
import { fileURLToPath } from 'url'
import { WebPieces } from '../sqlite/index.js'
import { Config } from '../../lib/config/config.js'
import { createHash } from 'crypto'
import { bufferToBase64, replaceAsync } from './utils.js'
import { IconProps, OpengraphProps } from '../../types.js'

const CompiledStore: Record<string, Component> = {}

async function getSvelteComponent(sveltePath: string): Promise<(typeof CompiledStore)[string]> {
	const svelteHash = createHash('md5').update(sveltePath).digest('hex').slice(0, 8)
	const svelteId = `${path.basename(sveltePath)}-${svelteHash}`
	const __dirname = path.dirname(fileURLToPath(import.meta.url))

	if (!CompiledStore[svelteId]) {
		const svelteCode = await readFile(sveltePath, 'utf-8')
		const svelteModulePath = path.join(__dirname, 'components', `${svelteId}.js`)
		const svelteCompiled = compile(svelteCode, {
			generate: 'server',
			filename: svelteId,
			css: 'injected',
			experimental: {
				async: true,
			},
		})

		const fontRegExp = /src:\s*url\((.*\.woff2?)\)/g
		const compiledCode = await replaceAsync(
			svelteCompiled.js.code,
			fontRegExp,
			async (_, fontPath) => {
				const fullFontPath = path.join(path.dirname(sveltePath), fontPath)
				const fontBuffer = await readFile(fullFontPath)
				const fontExt = path.extname(fullFontPath).slice(1)
				const base64Font = bufferToBase64(fontBuffer, 'font', fontExt)

				return `src: url(data:font/${fontExt};base64,${base64Font})`
			}
		)

		await writeFile(svelteModulePath, compiledCode)
		const opengraphModule = await import(svelteModulePath)
		CompiledStore[svelteId] = opengraphModule.default as Component
	}

	return CompiledStore[svelteId]
}

async function getOpengraphComponentForType(item: WebPieces, config: Config) {
	const ogComponentPath = config.pieces.find((p) => p.type === item.type)?.components?.opengraph

	if (ogComponentPath && config.paths.config) {
		const ogPath = path.join(path.dirname(config.paths.config), ogComponentPath)
		return getSvelteComponent(ogPath) as Promise<Component<OpengraphProps>>
	} else {
		return null	
	}
}

async function getIconComponentForType(item: WebPieces, config: Config) {
	const iconComponentPath = config.pieces.find((p) => p.type === item.type)?.components?.icon

	if (iconComponentPath && config.paths.config) {
		const fullPath = path.join(path.dirname(config.paths.config), iconComponentPath)
		return getSvelteComponent(fullPath) as Promise<Component<IconProps>>
	} else {
		return null
	}
}

export { getSvelteComponent, getOpengraphComponentForType, getIconComponentForType }
