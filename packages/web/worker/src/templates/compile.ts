import { build } from 'esbuild'
import { compile, type Warning } from 'svelte/compiler'

export interface CompiledTemplate {
	code: string
	warnings: Warning[]
}

const templateModuleId = 'luzzle:template'
const renderEntry = `
import Template from '${templateModuleId}';
import { render as renderSvelte } from 'svelte/server';

export function render(props) {
	const { body, head } = renderSvelte(Template, { props });
	return { body, head };
}
`

export async function compileTemplate(source: string, filename: string): Promise<CompiledTemplate> {
	const compiled = compile(source, {
		filename,
		generate: 'server',
		css: 'injected',
		dev: false,
		experimental: { async: false },
	})

	const bundled = await build({
		stdin: { contents: renderEntry, resolveDir: import.meta.dirname },
		bundle: true,
		write: false,
		platform: 'node',
		format: 'esm',
		target: 'node24',
		conditions: ['node', 'production'],
		define: { 'process.env.NODE_ENV': '"production"' },
		plugins: [
			{
				name: 'compiled-template',
				setup(builder) {
					builder.onResolve({ filter: new RegExp(`^${templateModuleId}$`) }, () => ({
						path: filename,
						namespace: templateModuleId,
					}))
					builder.onLoad({ filter: /.*/, namespace: templateModuleId }, () => ({
						contents: compiled.js.code,
						loader: 'js',
						resolveDir: import.meta.dirname,
					}))
				},
			},
		],
	})

	return { code: bundled.outputFiles[0].text, warnings: compiled.warnings }
}
