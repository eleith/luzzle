import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { prepareIsolatedFixture } from './support/prepare-isolated.js';

const exec = promisify(execFile);

test('host runtime-only copy renders under a native guard without ancestor dependency fallback', async (t) => {
	const cache = fileURLToPath(new URL('../node_modules/.cache/', import.meta.url));
	await mkdir(cache, { recursive: true });
	const work = await mkdtemp(path.join(cache, 'isolated-'));
	t.after(() => rm(work, { recursive: true, force: true }));
	const isolated = await prepareIsolatedFixture(path.join(work, 'application'));
	assert.deepEqual(await readdir(path.join(isolated.root, 'node_modules/@luzzle')), [
		'web.templates'
	]);
	const manifest = JSON.parse(
		await readFile(path.join(isolated.packageDirectory, 'package.json'), 'utf8')
	);
	assert.equal(manifest.dependencies, undefined);
	assert.equal(manifest.devDependencies, undefined);
	assert.equal(manifest.peerDependencies, undefined);
	assert.deepEqual((await readdir(isolated.packageDirectory)).sort(), ['dist', 'package.json']);

	for (const conditions of [['production'], ['development'], ['development', 'production']]) {
		const { stdout } = await exec(
			process.execPath,
			['--conditions=node', ...conditions.map((c) => `--conditions=${c}`), isolated.entry],
			{ cwd: isolated.root }
		);
		assert.equal(JSON.parse(stdout).ok, true);
	}

	const outside = path.join(work, 'outside.js');
	await writeFile(outside, 'throw new Error("OUTSIDE EXECUTED");');
	const ancestorPackage = path.join(work, 'node_modules/forbidden-ancestor');
	await mkdir(ancestorPackage, { recursive: true });
	await writeFile(
		path.join(ancestorPackage, 'package.json'),
		'{"type":"module","exports":"./index.js"}'
	);
	await writeFile(path.join(ancestorPackage, 'index.js'), 'throw new Error("ANCESTOR EXECUTED");');
	const guardEntry = path.join(isolated.root, 'guard-negative.mjs');
	await writeFile(
		guardEntry,
		`import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { registerResolutionGuard } from './resolution-guard.js';
registerResolutionGuard(fileURLToPath(new URL('.', import.meta.url)));
for (const specifier of ['../outside.js', 'forbidden-ancestor', 'data:text/javascript,export default 1']) {
  await assert.rejects(import(specifier), /Isolation guard rejected/);
}
console.log('guard passed');
`
	);
	const { stdout } = await exec(process.execPath, [guardEntry], { cwd: isolated.root });
	assert.match(stdout, /guard passed/);
});
