import { randomUUID } from 'node:crypto';
import { createRequire, registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { Component } from 'svelte';
import { compile, type CompileError } from 'svelte/compiler';
import { checkServerTemplateFeatures } from './validate.ts';

type Props = Record<string, unknown>;

const requireNative = createRequire(import.meta.url);
const { render } = requireNative('svelte/server') as typeof import('svelte/server');

const runtimeBase = pathToFileURL(requireNative.resolve('svelte/package.json')).href;

function loadComponent(code: string): Component<Props> {
	// A file URL next to Svelte lets Node resolve the generated imports regardless of cwd.
	// The load hook supplies the source; no file is written.
	const moduleURL = new URL(`luzzle-template-${randomUUID()}.mjs`, runtimeBase).href;
	const hooks = registerHooks({
		resolve(specifier, context, next) {
			if (specifier === moduleURL) return { url: moduleURL, shortCircuit: true };
			return next(specifier, context);
		},
		load(url, context, next) {
			if (url === moduleURL) return { format: 'module', source: code, shortCircuit: true };
			return next(url, context);
		}
	});
	try {
		return requireNative(moduleURL).default;
	} finally {
		hooks.deregister();
	}
}

function templateError(filename: string, cause: unknown, location = '') {
	const message = cause instanceof Error ? cause.message : String(cause);
	return new Error(`${filename}${location}: ${message}`, { cause });
}

/** Compile trusted operator-authored Svelte; loading and rendering execute Node code.
 * Feature checks provide authoring diagnostics, not isolation. Compile once per design or edit,
 * not per render: Node retains loaded modules for the lifetime of the process.
 */
export async function compileTemplate(filename: string, source: string) {
	let result;
	try {
		result = compile(source, { filename, generate: 'server', css: 'external', modernAst: true });
	} catch (cause) {
		const { start } = cause as CompileError;
		throw templateError(filename, cause, start ? `:${start.line}:${start.column + 1}` : '');
	}

	checkServerTemplateFeatures(result.ast, filename, source);
	let template: Component<Props>;
	try {
		template = loadComponent(result.js.code);
	} catch (cause) {
		throw templateError(filename, cause);
	}
	return {
		css: result.css?.code ?? '',
		render(props: Props, options: { idPrefix?: string } = {}): string {
			try {
				return render(template, { props, idPrefix: options.idPrefix }).body;
			} catch (cause) {
				throw templateError(filename, cause);
			}
		}
	};
}
