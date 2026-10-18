import test from 'node:test';
import assert from 'node:assert/strict';
import { rewriteRuntimeImports } from './support/rewrite-imports.js';

test('rewrites only allowlisted AST module specifiers, not comments, strings or templates', () => {
	const input = `// import x from 'svelte';
import {getContext} from 'svelte';
import * as $ from 'svelte/internal/server';
export {render} from 'svelte/server';
const literal = 'svelte/internal/server';
const template = \`svelte/server\`;
`;
	const output = rewriteRuntimeImports(input);
	assert.ok(output.includes('from "@luzzle/web.templates/runtime/svelte"'));
	assert.ok(output.includes('from "@luzzle/web.templates/runtime/internal-server"'));
	assert.ok(output.includes('from "@luzzle/web.templates/runtime/server"'));
	assert.ok(output.includes("// import x from 'svelte';"));
	assert.ok(output.includes("const literal = 'svelte/internal/server';"));
	assert.ok(output.includes('const template = `svelte/server`;'));
});

test('rejects unknown imports, reexports, side effects, and dynamic imports', () => {
	for (const input of [
		`import 'svelte/internal/client';`,
		`import './local-component.js';`,
		`import x from 'node:fs';`,
		`export * from 'svelte/compiler';`,
		`export { x } from 'unknown';`,
		`import('svelte');`
	])
		assert.throws(
			() => rewriteRuntimeImports(input),
			/Unsupported template import|Dynamic template imports/
		);
	assert.throws(() => rewriteRuntimeImports('import {'), SyntaxError);
});
