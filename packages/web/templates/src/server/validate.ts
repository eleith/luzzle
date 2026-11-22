import type { AST } from 'svelte/compiler';

const clientOnly = new Map([
	['OnDirective', 'event handlers'],
	['BindDirective', 'bindings'],
	['UseDirective', 'actions'],
	['AnimateDirective', 'animations'],
	['TransitionDirective', 'transitions'],
	['AttachTag', 'attachments'],
	['SvelteWindow', '<svelte:window>'],
	['SvelteDocument', '<svelte:document>'],
	['SvelteBody', '<svelte:body>']
]);

type Node = Record<string, unknown>;

function hasRuntimeModuleDependency(node: Node) {
	// The compiler's modern AST has already erased TypeScript-only imports.
	const { type } = node;
	return (
		type === 'ImportDeclaration' ||
		type === 'ImportExpression' ||
		((type === 'ExportNamedDeclaration' || type === 'ExportAllDeclaration') && !!node.source)
	);
}

function isEffectCall(node: Node) {
	if (node.type !== 'CallExpression') return false;
	const callee = node.callee as Node;
	// Match $effect(...) and $effect.pre(...) etc., not an author's data.$effect.
	const root = callee.type === 'MemberExpression' ? (callee.object as Node) : callee;
	return root.type === 'Identifier' && root.name === '$effect';
}

function isScriptElement(node: Node) {
	const tag = node.type === 'SvelteElement' ? (node.tag as Node).value : node.name;
	return typeof tag === 'string' && tag.toLowerCase() === 'script';
}

function eventHandlerAttribute(node: Node) {
	const attributes = node.attributes as Node[];
	return attributes.find((attr) => attr.type === 'Attribute' && /^on/i.test(String(attr.name)));
}

function unsupportedFeatureMessage(node: Node): string | undefined {
	const { type } = node;
	if (hasRuntimeModuleDependency(node)) {
		return 'Runtime imports and re-exports are not supported. Use import type or inline the code.';
	}
	if (isEffectCall(node)) return '$effect does not run on the server.';
	if (type === 'SvelteHead') return 'Render body markup instead of <svelte:head>.';
	if (type === 'AwaitBlock') return 'Resolve async data before rendering.';
	const feature = clientOnly.get(String(type));
	if (feature) return `Server templates do not support ${feature}.`;
}

export function checkServerTemplateFeatures(ast: AST.Root, filename: string, source: string) {
	function fail(offset: number, message: string): never {
		const lines = source.slice(0, offset).split('\n');
		throw new Error(
			`${filename}:${lines.length}:${lines[lines.length - 1].length + 1}: ${message}`
		);
	}

	function visit(value: unknown) {
		if (!value || typeof value !== 'object') return;
		const node = value as Node;
		if (node.type === 'RegularElement' || node.type === 'SvelteElement') {
			if (isScriptElement(node)) fail(Number(node.start), 'Remove the browser script.');
			const handler = eventHandlerAttribute(node);
			if (handler) fail(Number(handler.start), `Remove event handler ${handler.name}.`);
		}
		const message = unsupportedFeatureMessage(node);
		if (message) fail(Number(node.start), message);
		for (const child of Object.values(node)) visit(child);
	}

	if (ast.options) fail(ast.options.start, 'Remove <svelte:options> from the template.');
	visit(ast.module);
	visit(ast.instance);
	visit(ast.fragment);
}
