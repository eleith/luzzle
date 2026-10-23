import { build } from 'esbuild'
import { compile, type Warning } from 'svelte/compiler'
import { createRenderEntry } from './entry.js'
import { createPieceIconSource, readDefaultIconSource } from './piece-icon.js'
import type { TemplateLookup, TemplateSource } from './types.js'
import workerPackage from '../../package.json' with { type: 'json' }

export type { TemplateSource } from './types.js'

export interface CompiledTemplateBundle {
	moduleCode: string
	warnings: Warning[]
}

const templateModulePrefix = 'luzzle:template/'
const serverCompileOptions = {
	generate: 'server',
	css: 'injected',
	dev: false,
	experimental: { async: false },
} as const

export async function compileTemplateBundle(
	templates: Readonly<Record<string, TemplateSource>>,
	templateLookup: TemplateLookup = { site: {} }
): Promise<CompiledTemplateBundle> {
	const nodeMinimum = workerPackage.engines.node?.match(/^>=(\d+(?:\.\d+){0,2})$/)?.[1] ?? '24'
	const modules = new Map<string, string>()
	const templateModules = new Map<string, string>()
	const warnings: Warning[] = []

	const defaultIconModuleId = `${templateModulePrefix}default-icon`
	const defaultIcon = await readDefaultIconSource()
	modules.set(
		defaultIconModuleId,
		compile(defaultIcon.source, {
			...serverCompileOptions,
			filename: defaultIcon.filename,
		}).js.code
	)

	for (const [name, template] of Object.entries(templates)) {
		const moduleId = `${templateModulePrefix}${modules.size}`
		const compiled = compile(template.source, {
			...serverCompileOptions,
			filename: template.filename,
		})
		modules.set(moduleId, compiled.js.code)
		templateModules.set(name, moduleId)
		warnings.push(...compiled.warnings)
	}

	const iconComponentModuleId = `${templateModulePrefix}piece-icon`
	const iconComponent = createPieceIconSource(templateModules, defaultIconModuleId, templateLookup)
	modules.set(
		iconComponentModuleId,
		compile(iconComponent.source, {
			...serverCompileOptions,
			filename: iconComponent.filename,
		}).js.code
	)

	const bundled = await build({
		stdin: {
			contents: createRenderEntry(iconComponentModuleId),
			resolveDir: import.meta.dirname,
		},
		bundle: true,
		write: false,
		platform: 'node',
		format: 'esm',
		target: `node${nodeMinimum}`,
		conditions: ['node', 'production'],
		define: { 'process.env.NODE_ENV': '"production"' },
		plugins: [
			{
				name: 'compiled-templates',
				setup(builder) {
					builder.onResolve({ filter: new RegExp(`^${templateModulePrefix}`) }, ({ path }) => ({
						path,
						namespace: templateModulePrefix,
					}))
					builder.onLoad({ filter: /.*/, namespace: templateModulePrefix }, ({ path }) => ({
						contents: modules.get(path),
						loader: 'js',
						resolveDir: import.meta.dirname,
					}))
				},
			},
		],
	})

	return { moduleCode: bundled.outputFiles[0].text, warnings }
}
