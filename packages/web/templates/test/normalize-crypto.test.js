import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parse } from 'acorn';
import { normalizeCryptoImport } from '../build/normalize-crypto.js';

const require = createRequire(import.meta.url);
const source = `const obfuscated_import = (module_name) => import(/* @vite-ignore */ module_name);
export const fallback = () => obfuscated_import('node:crypto');`;

test('normalizes the pinned upstream fallback to a literal builtin import', async () => {
	const directory = path.dirname(require.resolve('svelte/package.json'));
	const upstream = await readFile(path.join(directory, 'src/internal/server/crypto.js'), 'utf8');
	const normalized = normalizeCryptoImport(upstream);
	assert.ok(normalized.includes("import(/* @vite-ignore */ 'node:crypto')"));
	assert.ok(!normalized.includes('import(/* @vite-ignore */ module_name)'));
	parse(normalized, { ecmaVersion: 'latest', sourceType: 'module' });
});

test('fails closed when the upstream helper or its use changes', () => {
	for (const changed of [
		source.replace('node:crypto', 'node:fs'),
		source.replace("'node:crypto'", 'unknown'),
		source.replace('module_name', 'renamed'),
		source + "\nobfuscated_import('node:fs');",
		source + "\nimport('node:fs');",
		source + '\nexport { obfuscated_import };',
		source.replace('=> import(/* @vite-ignore */ module_name)', '=> null')
	])
		assert.throws(
			() => normalizeCryptoImport(changed),
			/Unsupported upstream Svelte crypto fallback/
		);
});
