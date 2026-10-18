import { cp, mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareFixtures } from './prepare-fixtures.js';

/** Host copy-layout simulation, NOT evidence of pnpm deploy or production pruning. */
export async function prepareIsolatedFixture(directory) {
	const root = path.resolve(directory);
	await mkdir(root, { recursive: true });
	if ((await readdir(root)).length) throw new Error('Isolated fixture root must be empty');
	const packageDirectory = path.join(root, 'node_modules/@luzzle/web.templates');
	const fixturesDirectory = path.join(root, 'prepared/revision');
	await mkdir(packageDirectory, { recursive: true });
	const sourceManifest = JSON.parse(
		await readFile(new URL('../../package.json', import.meta.url), 'utf8')
	);
	const productionManifest = {
		name: sourceManifest.name,
		version: sourceManifest.version,
		private: true,
		type: 'module',
		engines: sourceManifest.engines,
		exports: sourceManifest.exports
	};
	await cp(new URL('../../dist/', import.meta.url), path.join(packageDirectory, 'dist'), {
		recursive: true
	});
	await writeFile(
		path.join(packageDirectory, 'package.json'),
		JSON.stringify(productionManifest, null, '\t') + '\n'
	);
	await writeFile(path.join(root, 'package.json'), '{"private":true,"type":"module"}\n');
	await prepareFixtures(fixturesDirectory);
	for (const name of ['check-fixtures.js', 'check-production-tree.js', 'resolution-guard.js']) {
		await copyFile(new URL(name, import.meta.url), path.join(root, name));
	}
	const entry = path.join(root, 'verify.mjs');
	await writeFile(
		entry,
		`import { fileURLToPath } from 'node:url';
import { registerResolutionGuard } from './resolution-guard.js';
import { checkProductionTree } from './check-production-tree.js';
const root = fileURLToPath(new URL('.', import.meta.url));
registerResolutionGuard(root);
await checkProductionTree(root);
const { renderTemplate, components } = await import('@luzzle/web.templates');
const { render } = await import('@luzzle/web.templates/runtime/server');
const { getContext } = await import('@luzzle/web.templates/runtime/svelte');
const { checkPreparedFixtures } = await import('./check-fixtures.js');
const result = await checkPreparedFixtures({
  directory: fileURLToPath(new URL('./prepared/revision/', import.meta.url)),
  renderTemplate, render, components
});
let outsideComponentRejected = false;
try { getContext('fixture-request'); } catch { outsideComponentRejected = true; }
if (!outsideComponentRejected) throw new Error('SSR context leaked outside render');
console.log(JSON.stringify({ ok: true, requestsChecked: result.requestsChecked }));
`
	);
	return { root, entry, packageDirectory, fixturesDirectory };
}
