import { readFile } from 'fs/promises'
import { Component } from 'svelte'
import { compile } from 'svelte/compiler'
import path from 'path'
import { WebPieces } from '../sqlite/index.js'
import { Config } from '../../lib/config/config.js'
import { createHash } from 'crypto'
import { bufferToBase64, replaceAsync } from './utils.js'
import { PieceIconProps, PieceOpengraphProps } from '../../types.js'

const CompiledStore: Record<string, Component> = {}

async function embedFontsInCompiledCode(code: string, sveltePath: string) {
	const fontRegExp = /src:\s*url\((.*\.woff2?)\)/g
	const codeWithFonts = await replaceAsync(code, fontRegExp, async (_, fontPath) => {
		const fullFontPath = path.join(path.dirname(sveltePath), fontPath)
		const fontBuffer = await readFile(fullFontPath)
		const fontExt = path.extname(fullFontPath).slice(1)
		const base64Font = bufferToBase64(fontBuffer, 'font', fontExt)

		return `src: url(data:font/${fontExt};base64,${base64Font})`
	})
	return codeWithFonts
}

async function replaceImportsInCompiledCode(code: string) {
	const importRegex = /(from|import)\s+(['"])([^'"]+)\2/g
	const finalCompiledCode = await replaceAsync(
		code,
		importRegex,
		async (match, keyword, quote, specifier) => {
			if (specifier.startsWith('.') || specifier.startsWith('/')) {
				return match
			}

			try {
				const resolvedPath = import.meta.resolve(specifier).toString()
				return `${keyword} ${quote}${resolvedPath}${quote}`
			} catch (err) {
				console.error(`Could not resolve module: ${specifier}`, err)
				return match
			}
		}
	)
	return finalCompiledCode
}

async function getSvelteComponent(sveltePath: string): Promise<(typeof CompiledStore)[string]> {
	const svelteHash = createHash('md5').update(sveltePath).digest('hex').slice(0, 8)
	const svelteId = `${path.basename(sveltePath)}-${svelteHash}`

	if (!CompiledStore[svelteId]) {
		const svelteCode = await readFile(sveltePath, 'utf-8')
		const svelteCompiled = compile(svelteCode, {
			generate: 'server',
			filename: svelteId,
			css: 'injected',
			experimental: {
				async: true,
			},
		})

		const compiledCodeWithFonts = await embedFontsInCompiledCode(svelteCompiled.js.code, sveltePath)
		const finalCompiledCode = await replaceImportsInCompiledCode(compiledCodeWithFonts)
		const encodedCode = encodeURIComponent(finalCompiledCode)
		const opengraphModule = await import(`data:text/javascript,${encodedCode}`)
		CompiledStore[svelteId] = opengraphModule.default as Component
	}

	return CompiledStore[svelteId]
}

async function getOpengraphComponentForType(item: WebPieces, config: Config) {
	const ogComponentPath = config.pieces.find((p) => p.type === item.type)?.components?.opengraph

	if (ogComponentPath && config.paths.config) {
		const ogPath = path.join(path.dirname(config.paths.config), ogComponentPath)
		return getSvelteComponent(ogPath) as Promise<Component<PieceOpengraphProps>>
	} else {
		return null
	}
}

async function getIconComponentForType(item: WebPieces, config: Config) {
	const iconComponentPath = config.pieces.find((p) => p.type === item.type)?.components?.icon

	if (iconComponentPath && config.paths.config) {
		const fullPath = path.join(path.dirname(config.paths.config), iconComponentPath)
		return getSvelteComponent(fullPath) as Promise<Component<PieceIconProps>>
	} else {
		return null
	}
}

export { getSvelteComponent, getOpengraphComponentForType, getIconComponentForType }
