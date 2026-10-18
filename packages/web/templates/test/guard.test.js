import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, copyFile, writeFile, rm, symlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const exec = promisify(execFile);

test('native guard permits local/builtin imports and rejects direct, symlink, ancestor and data escapes', async (t) => {
	const cache = fileURLToPath(new URL('../node_modules/.cache/', import.meta.url));
	await mkdir(cache, { recursive: true });
	const directory = await mkdtemp(path.join(cache, 'guard-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	const root = path.join(directory, 'isolated');
	await mkdir(root);
	await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
	await copyFile(
		new URL('./support/resolution-guard.js', import.meta.url),
		path.join(root, 'guard.js')
	);
	await writeFile(path.join(root, 'allowed.js'), 'export const value = 42;');
	await writeFile(path.join(directory, 'outside.js'), 'throw new Error("OUTSIDE EXECUTED");');
	await symlink('../outside.js', path.join(root, 'escape.js'));
	const ancestor = path.join(directory, 'node_modules/guard-ancestor');
	await mkdir(ancestor, { recursive: true });
	await writeFile(path.join(ancestor, 'package.json'), '{"type":"module","exports":"./index.js"}');
	await writeFile(path.join(ancestor, 'index.js'), 'throw new Error("ANCESTOR EXECUTED");');
	const entry = path.join(root, 'check.mjs');
	await writeFile(
		entry,
		`import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { registerResolutionGuard } from './guard.js';
registerResolutionGuard(fileURLToPath(new URL('.', import.meta.url)));
assert.equal((await import('./allowed.js')).value, 42);
assert.equal(typeof (await import('node:fs')).readFileSync, 'function');
for (const specifier of ['../outside.js', './escape.js', 'guard-ancestor', 'data:text/javascript,export default 1']) {
  await assert.rejects(import(specifier), /Isolation guard rejected/);
}
console.log('guard passed');
`
	);
	const { stdout } = await exec(process.execPath, [entry], { cwd: root });
	assert.match(stdout, /guard passed/);
});
