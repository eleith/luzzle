import { parse } from 'acorn';
import MagicString from 'magic-string';

// Svelte 5.55's Node 18 fallback hides a builtin import from browser bundlers.
// Our runtime is Node-only: make that one import statically auditable.
export function normalizeCryptoImport(source) {
	const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
	const imports = [];
	const bindings = [];
	const calls = [];
	let references = 0;
	function visit(node) {
		if (!node || typeof node !== 'object') return;
		if (node.type === 'ImportExpression') imports.push(node);
		if (node.type === 'Identifier' && node.name === 'obfuscated_import') references++;
		if (node.type === 'VariableDeclarator' && node.id.name === 'obfuscated_import')
			bindings.push(node);
		if (node.type === 'CallExpression' && node.callee.name === 'obfuscated_import')
			calls.push(node);
		for (const value of Object.values(node)) {
			if (Array.isArray(value)) value.forEach(visit);
			else if (value && typeof value === 'object') visit(value);
		}
	}
	visit(ast);
	const helper = bindings[0]?.init;
	const argument = calls[0]?.arguments[0];
	if (
		imports.length !== 1 ||
		bindings.length !== 1 ||
		calls.length !== 1 ||
		references !== 2 ||
		helper?.type !== 'ArrowFunctionExpression' ||
		helper.async ||
		helper.params.length !== 1 ||
		helper.params[0].name !== 'module_name' ||
		helper.body !== imports[0] ||
		imports[0].source.type !== 'Identifier' ||
		imports[0].source.name !== 'module_name' ||
		calls[0].arguments.length !== 1 ||
		argument?.type !== 'Literal' ||
		argument.value !== 'node:crypto'
	) {
		throw new Error('Unsupported upstream Svelte crypto fallback; review the pinned runtime');
	}
	return new MagicString(source)
		.overwrite(imports[0].source.start, imports[0].source.end, "'node:crypto'")
		.toString();
}
