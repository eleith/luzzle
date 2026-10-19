import test from 'node:test';
import assert from 'node:assert/strict';
import { isBuiltin } from 'node:module';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'acorn';
import { rollup } from 'rollup';

const root = fileURLToPath(new URL('../', import.meta.url));

async function files(directory, prefix = '') {
	const entries = await readdir(directory, { withFileTypes: true });
	const result = [];
	for (const entry of entries) {
		const relative = path.join(prefix, entry.name);
		if (entry.isDirectory())
			result.push(...(await files(path.join(directory, entry.name), relative)));
		else result.push(relative);
	}
	return result.sort();
}

test('manifest always selects built JS and the runtime installation has only local/builtin imports', async () => {
	const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
	assert.equal(manifest.dependencies, undefined);
	assert.equal(manifest.peerDependencies, undefined);
	const typeExports = {
		'./pieces/props': './dist/pieces/props.d.ts',
		'./site/props': './dist/site/props.d.ts',
		'./components/props': './dist/components/props.d.ts',
		'./helpers': './dist/helpers.d.ts'
	};
	for (const [name, conditions] of Object.entries(manifest.exports)) {
		if (name === './compatibility.json') continue;
		if (Object.hasOwn(typeExports, name)) {
			assert.deepEqual(conditions, { types: typeExports[name] });
			assert.ok((await readFile(path.join(root, conditions.types), 'utf8')).length);
			await assert.rejects(import(`${manifest.name}/${name.slice(2)}`), {
				code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'
			});
			continue;
		}
		assert.equal(conditions.development, conditions.default);
		assert.match(conditions.default, /^\.\/dist\/.*\.js$/);
	}
	const dist = path.join(root, 'dist');
	for (const filename of await files(dist)) {
		assert.match(filename, /\.(js|json)$|\.d\.ts$/); // declarations, never executable TS or maps
		if (!filename.endsWith('.js')) continue;
		const code = await readFile(path.join(dist, filename), 'utf8');
		assert.ok(!code.includes(root), 'absolute checkout path entered a runtime chunk');
		const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
		function visit(node) {
			if (!node || typeof node !== 'object') return;
			if (node.type === 'ImportExpression') {
				assert.equal(node.source.type, 'Literal', 'unverifiable dynamic runtime import');
				check(node.source.value);
			}
			if (
				node.source &&
				['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type)
			) {
				check(node.source.value);
			}
			for (const value of Object.values(node)) {
				if (Array.isArray(value)) value.forEach(visit);
				else if (value && typeof value === 'object') visit(value);
			}
		}
		function check(specifier) {
			assert.ok(
				isBuiltin(specifier) || specifier.startsWith('.'),
				`external dependency ${specifier}`
			);
			if (specifier.startsWith('.')) {
				const resolved = path.resolve(path.dirname(path.join(dist, filename)), specifier);
				assert.ok(resolved.startsWith(dist + path.sep), 'relative runtime import escapes dist');
			}
		}
		visit(ast);
	}
});

test('one shared release graph is byte-identical in different checkout paths', async (t) => {
	const cache = path.join(root, 'node_modules/.cache');
	await mkdir(cache, { recursive: true });
	const scratch = await mkdtemp(path.join(cache, 'reproducible-'));
	t.after(() => rm(scratch, { recursive: true, force: true }));
	const outputs = [];
	for (const name of ['checkout-a', 'different-checkout-b']) {
		const checkout = path.join(scratch, name);
		await mkdir(checkout);
		for (const file of ['src', 'build', 'rollup.config.js', 'package.json']) {
			await cp(path.join(root, file), path.join(checkout, file), { recursive: true });
		}
		const { default: config } = await import(
			pathToFileURL(path.join(checkout, 'rollup.config.js'))
		);
		const { output, ...input } = config;
		const bundle = await rollup(input);
		try {
			await bundle.write(output);
		} finally {
			await bundle.close();
		}
		const dist = path.join(checkout, 'dist');
		const contents = {};
		for (const filename of await files(dist))
			contents[filename] = await readFile(path.join(dist, filename), 'utf8');
		outputs.push(contents);
	}
	assert.deepEqual(outputs[0], outputs[1]);
	assert.ok(Object.keys(outputs[0]).some((file) => file.startsWith('chunks/')));
	assert.equal(Object.keys(outputs[0]).filter((file) => file.startsWith('runtime/')).length, 3);
	const changedCheckout = path.join(scratch, 'different-checkout-b');
	const changedIcon = path.join(changedCheckout, 'src/components/DefaultIcon.svelte');
	await writeFile(
		changedIcon,
		(await readFile(changedIcon, 'utf8')).replace(
			'data.piece.title ?? data.piece.id',
			"data.piece.title ?? 'changed-default'"
		)
	);
	const { default: changedConfig } = await import(
		pathToFileURL(path.join(changedCheckout, 'rollup.config.js')).href + '?changed'
	);
	const { output: changedOutput, ...changedInput } = changedConfig;
	const changedBundle = await rollup(changedInput);
	try {
		await changedBundle.write(changedOutput);
	} finally {
		await changedBundle.close();
	}
	const changedMetadata = JSON.parse(
		await readFile(path.join(changedCheckout, 'dist/compatibility.json'), 'utf8')
	);
	assert.notEqual(
		changedMetadata.runtimeFingerprint,
		JSON.parse(outputs[0]['compatibility.json']).runtimeFingerprint
	);
});
