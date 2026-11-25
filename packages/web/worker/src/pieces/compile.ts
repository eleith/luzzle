import { readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { compile } from 'svelte/compiler'
import type { Component } from 'svelte'
import type { PublicWebPiece, PieceComponentHelpers } from '@luzzle/web.pieces'
import type { PieceTemplateData } from '@luzzle/web.templates/pieces/fields'

type CompiledModule = {
	default: Component<{
		piece: PublicWebPiece
		fields: PieceTemplateData['opengraph']['fields']
		helpers: PieceComponentHelpers
	}>
}

const require = createRequire(import.meta.url)
let cached: { mtimeMs: number; mod: CompiledModule } | undefined
const compiledDirectory = path.join(import.meta.dirname, '.compiled')

export async function getDefaultOpengraphModule(): Promise<CompiledModule> {
	const filename = require.resolve('@luzzle/web.templates/opengraphs/default')
	const { mtimeMs } = statSync(filename)
	if (cached?.mtimeMs === mtimeMs) return cached.mod

	const { js } = compile(readFileSync(filename, 'utf8'), {
		filename,
		generate: 'server',
		css: 'injected',
		dev: false,
	})
	mkdirSync(compiledDirectory, { recursive: true })
	const output = path.join(compiledDirectory, `default-${mtimeMs}.js`)
	writeFileSync(output, js.code, 'utf8')
	const mod = (await import(pathToFileURL(output).href)) as CompiledModule
	cached = { mtimeMs, mod }
	return mod
}
