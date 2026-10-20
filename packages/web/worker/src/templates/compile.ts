import { build } from 'esbuild'
import { compile, type Warning } from 'svelte/compiler'
import workerPackage from '../../package.json' with { type: 'json' }

export interface TemplateSource {
	source: string
	filename: string
}

export interface CompiledTemplateBundle {
	moduleCode: string
	warnings: Warning[]
}

const templateModulePrefix = 'luzzle:template/'

export async function compileTemplateBundle(
	templates: Readonly<Record<string, TemplateSource>>
): Promise<CompiledTemplateBundle> {
	const nodeMinimum = workerPackage.engines.node?.match(/^>=(\d+(?:\.\d+){0,2})$/)?.[1] ?? '24'
	const modules = new Map<string, string>()
	const imports: string[] = []
	const entries: string[] = []
	const warnings: Warning[] = []

	for (const [name, template] of Object.entries(templates)) {
		const component = `Template${modules.size}`
		const moduleId = `${templateModulePrefix}${modules.size}`
		const compiled = compile(template.source, {
			filename: template.filename,
			generate: 'server',
			css: 'injected',
			dev: false,
			experimental: { async: false },
		})
		modules.set(moduleId, compiled.js.code)
		warnings.push(...compiled.warnings)
		imports.push(`import ${component} from ${JSON.stringify(moduleId)};`)
		entries.push(`[${JSON.stringify(name)}, ${component}]`)
	}

	const renderEntry = `
${imports.join('\n')}
import { render as renderSvelte } from 'svelte/server';
const templates = new Map([${entries.join(',\n')}]);

export function render(name, props) {
	const Template = templates.get(name);
	if (!Template) throw new Error('Unknown template: ' + name);
	const { body, head } = renderSvelte(Template, { props });
	return { body, head };
}
`

	const bundled = await build({
		stdin: { contents: renderEntry, resolveDir: import.meta.dirname },
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
