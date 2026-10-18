import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProductionTree } from './support/check-production-tree.js';

async function scratch(t) {
	const cache = fileURLToPath(new URL('../node_modules/.cache/', import.meta.url));
	await mkdir(cache, { recursive: true });
	const root = await mkdtemp(path.join(cache, 'production-tree-'));
	t.after(() => rm(root, { recursive: true, force: true }));
	await mkdir(path.join(root, 'node_modules'));
	return root;
}

test('accepts the runtime-only production layout', async (t) => {
	const root = await scratch(t);
	const directory = path.join(root, 'node_modules/@luzzle/web.templates');
	await mkdir(directory, { recursive: true });
	await writeFile(path.join(directory, 'package.json'), '{"name":"@luzzle/web.templates"}');
	await checkProductionTree(root);
});

test('rejects dormant compiler/toolchain packages hidden in a pnpm store', async (t) => {
	const root = await scratch(t);
	const directory = path.join(root, 'node_modules/.pnpm/unused/node_modules/unused');
	await mkdir(directory, { recursive: true });
	for (const name of [
		'svelte',
		'typescript',
		'rollup',
		'vite',
		'esbuild',
		'acorn',
		'magic-string',
		'prettier'
	]) {
		await writeFile(path.join(directory, 'package.json'), JSON.stringify({ name }));
		await assert.rejects(checkProductionTree(root), /Unexpected production dependency/);
	}
});

test('rejects production links escaping the isolated root', async (t) => {
	const root = await scratch(t);
	await symlink(path.dirname(root), path.join(root, 'node_modules/outside'), 'dir');
	await assert.rejects(checkProductionTree(root), /Production tree escapes isolated root/);
});
