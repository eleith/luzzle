import { readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { compile } from 'svelte/compiler'
import type { Config } from '@luzzle/web.config'

type CompiledModule = {
	default: unknown
}

const compileCache = new Map<string, { mtimeMs: number; mod: CompiledModule }>()

const COMPILED_DIR = path.join(import.meta.dirname, '.compiled')

export async function getCompiledOpengraphModule(
	pieceType: string,
	config: Config
): Promise<CompiledModule> {
	const pieceConfig = config.pieces.find((p) => p.type === pieceType)
	if (!pieceConfig) {
		throw new Error(`Piece type "${pieceType}" not found in config`)
	}

	const opengraphPath = pieceConfig.components?.opengraph
	if (!opengraphPath) {
		throw new Error(`No opengraph component configured for piece type "${pieceType}"`)
	}

	if (!config.paths.config) {
		throw new Error('config.paths.config is missing; cannot resolve opengraph component path')
	}

	const absoluteSourcePath = path.resolve(path.dirname(config.paths.config), opengraphPath)
	const stat = statSync(absoluteSourcePath)
	const mtimeMs = stat.mtimeMs

	const cached = compileCache.get(pieceType)
	if (cached && cached.mtimeMs === mtimeMs) {
		return cached.mod
	}

	const source = readFileSync(absoluteSourcePath, 'utf8')

	const { js } = compile(source, {
		generate: 'server',
		filename: absoluteSourcePath,
		css: 'injected'
	})

	mkdirSync(COMPILED_DIR, { recursive: true })
	const outFilename = `${pieceType}-${mtimeMs}.js`
	const outPath = path.join(COMPILED_DIR, outFilename)

	writeFileSync(outPath, js.code, 'utf8')

	const href = pathToFileURL(outPath).href + `?t=${mtimeMs}`
	const mod = (await import(href)) as CompiledModule

	compileCache.set(pieceType, { mtimeMs, mod })
	return mod
}
