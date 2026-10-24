import { readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { compile } from 'svelte/compiler'
import type { Component } from 'svelte'
import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
import { getOpengraphSchema } from '@luzzle/web.templates/opengraphs/schema'
import type { PieceTemplateData } from '@luzzle/web.templates/pieces/fields'

type CompiledModule = {
	default: Component<{
		piece: PublicWebPiece
		fields: PieceTemplateData['opengraph']['fields']
		helpers: PieceComponentHelpers
	}>
}

const require = createRequire(import.meta.url)
const compileCache = new Map<string, { mtimeMs: number; mod: CompiledModule }>()
const compiledDirectory = path.join(import.meta.dirname, '.compiled')

export async function getCompiledOpengraphModule(name: string): Promise<CompiledModule> {
	const definition = getOpengraphSchema(name)
	const filename = require.resolve(`@luzzle/web.templates/opengraphs/${definition.name}`)
	const { mtimeMs } = statSync(filename)
	const cached = compileCache.get(name)
	if (cached?.mtimeMs === mtimeMs) return cached.mod

	const { js } = compile(readFileSync(filename, 'utf8'), {
		filename,
		generate: 'server',
		css: 'injected',
		dev: false,
	})
	mkdirSync(compiledDirectory, { recursive: true })
	const output = path.join(compiledDirectory, `${name}-${mtimeMs}.js`)
	writeFileSync(output, js.code, 'utf8')
	const mod = (await import(pathToFileURL(output).href)) as CompiledModule
	compileCache.set(name, { mtimeMs, mod })
	return mod
}
