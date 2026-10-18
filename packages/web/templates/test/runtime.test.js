import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { renderTemplate, components, compatibility, assertCompatible } from '../dist/index.js';
import { render } from '../dist/runtime/server.js';
import { getContext } from '../dist/runtime/svelte.js';
import { render as internalRender } from '../dist/runtime/internal-server.js';
import { prepareFixtures } from './support/prepare-fixtures.js';
import { prepareIsolatedFixture } from './support/prepare-isolated.js';
import { checkPreparedFixtures } from './support/check-fixtures.js';

async function scratch(t) {
	const cache = fileURLToPath(new URL('../node_modules/.cache/', import.meta.url));
	await mkdir(cache, { recursive: true });
	const directory = await mkdtemp(path.join(cache, 'native-runtime-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	return directory;
}

test('real prepared Svelte fixtures share facades, adapters, helpers, context, head and CSS', async (t) => {
	assert.strictEqual(render, internalRender);
	const directory = await scratch(t);
	const isolated = await prepareIsolatedFixture(directory);
	const loadRuntime = (relative) =>
		import(pathToFileURL(path.join(isolated.packageDirectory, 'dist', relative)));
	const runtime = await loadRuntime('index.js');
	const server = await loadRuntime('runtime/server.js');
	const internal = await loadRuntime('runtime/internal-server.js');
	const svelte = await loadRuntime('runtime/svelte.js');
	assert.strictEqual(server.render, internal.render);
	await checkPreparedFixtures({
		directory: isolated.fixturesDirectory,
		renderTemplate: runtime.renderTemplate,
		render: server.render,
		components: runtime.components
	});
	assert.throws(() => svelte.getContext('fixture-request'), /lifecycle_outside_component/);
	assert.throws(() => getContext('fixture-request'), /lifecycle_outside_component/);
});

test('compatibility is exact, immutable, JSON-backed, and checked before executable imports', async (t) => {
	const directory = await scratch(t);
	const prepared = await prepareFixtures(directory);
	const candidate = JSON.parse(await readFile(prepared.compatibilityPath, 'utf8'));
	assertCompatible(candidate);
	assert.ok(Object.isFrozen(compatibility.compiler.options.experimental));
	assert.match(candidate.runtimeFingerprint, /^[a-f0-9]{64}$/);
	assert.deepEqual(candidate.compiler, {
		name: 'svelte',
		version: '5.55.9',
		options: { generate: 'server', dev: false, css: 'injected', experimental: { async: false } }
	});
	for (const mutate of [
		(value) => {
			value.schemaVersion++;
		},
		(value) => {
			value.compiler.version = '5.0.0';
		},
		(value) => {
			value.compiler.options.dev = true;
		},
		(value) => {
			value.compiler.options.experimental.async = true;
		},
		(value) => {
			value.runtimeFingerprint = '0'.repeat(64);
		},
		(value) => {
			value.extra = true;
		},
		(value) => {
			value.build.conditions = { ...value.build.conditions };
		}
	]) {
		const incompatible = structuredClone(candidate);
		mutate(incompatible);
		assert.throws(() => assertCompatible(incompatible), /Incompatible/);
	}
	assert.throws(() => assertCompatible(null), /Incompatible/);
	const reversed = Object.fromEntries(Object.entries(candidate).reverse());
	assertCompatible(reversed); // JSON property order is not part of compatibility.
	candidate.runtimeFingerprint = 'bad';
	await writeFile(prepared.compatibilityPath, JSON.stringify(candidate));
	await writeFile(prepared.modules.page, `throw new Error('EXECUTED BEFORE VALIDATION');`);
	await assert.rejects(
		checkPreparedFixtures({ directory, renderTemplate, render, components }),
		/Incompatible/
	);
	// Make sure the tampered module really is executable if imported directly.
	await assert.rejects(import(pathToFileURL(prepared.modules.page)), /EXECUTED BEFORE VALIDATION/);
});
