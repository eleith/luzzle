import { parse } from 'acorn';
import MagicString from 'magic-string';

export const runtimeImports = Object.freeze({
	svelte: '@luzzle/web.templates/runtime/svelte',
	'svelte/internal/server': '@luzzle/web.templates/runtime/internal-server',
	'svelte/server': '@luzzle/web.templates/runtime/server'
});

/** Rewrites AST source nodes only. Unknown dependencies and dynamic imports fail closed. */
export function rewriteRuntimeImports(code) {
	const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
	const output = new MagicString(code);
	function visit(node) {
		if (!node || typeof node !== 'object') return;
		if (node.type === 'ImportExpression')
			throw new Error('Dynamic template imports are unsupported');
		if (
			node.type === 'ImportDeclaration' ||
			node.type === 'ExportNamedDeclaration' ||
			node.type === 'ExportAllDeclaration'
		) {
			if (node.source) {
				const specifier = node.source.value;
				if (!Object.hasOwn(runtimeImports, specifier)) {
					throw new Error(`Unsupported template import: ${specifier}`);
				}
				output.overwrite(
					node.source.start,
					node.source.end,
					JSON.stringify(runtimeImports[specifier])
				);
			}
		}
		for (const value of Object.values(node)) {
			if (Array.isArray(value)) value.forEach(visit);
			else if (value && typeof value === 'object') visit(value);
		}
	}
	visit(ast);
	return output.toString();
}
