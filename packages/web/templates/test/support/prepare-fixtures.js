import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile, VERSION } from 'svelte/compiler';
import { compilerOptions } from '../../build/options.js';
import { rewriteRuntimeImports } from './rewrite-imports.js';

const names = {
	page: 'Page',
	icon: 'Icon',
	throwing: 'Throwing',
	noNavigation: 'NoNavigation',
	duplicateNavigation: 'DuplicateNavigation',
	contextProbe: 'ContextProbe'
};

/** Caller owns placement/cleanup. No global temporary paths or workspace copies. */
export async function prepareFixtures(outputDir) {
	const directory = path.resolve(outputDir);
	const compatibility = JSON.parse(
		await readFile(new URL('../../dist/compatibility.json', import.meta.url), 'utf8')
	);
	if (
		compatibility.compiler.version !== VERSION ||
		JSON.stringify(compatibility.compiler.options) !== JSON.stringify(compilerOptions)
	) {
		throw new Error('Build the runtime with the installed fixture compiler/options first');
	}
	await mkdir(directory, { recursive: true });
	await writeFile(path.join(directory, 'package.json'), '{"private":true,"type":"module"}\n');
	const modules = {};
	for (const [key, name] of Object.entries(names)) {
		const sourceFile = new URL(`../fixtures/${name}.svelte`, import.meta.url);
		const source = await readFile(sourceFile, 'utf8');
		const compiled = compile(source, {
			...compilerOptions,
			// Deliberately checkout-independent: these IDs affect generated CSS hashes.
			filename: `fixtures/${name}.svelte`
		});
		if (compiled.warnings.length) {
			throw new Error(
				`${fileURLToPath(sourceFile)}: ${compiled.warnings.map((w) => w.message).join('; ')}`
			);
		}
		const filename = path.join(directory, `${name}.js`);
		await writeFile(filename, rewriteRuntimeImports(compiled.js.code) + '\n');
		modules[key] = filename;
	}
	const compatibilityPath = path.join(directory, 'compatibility.json');
	await writeFile(compatibilityPath, JSON.stringify(compatibility, null, '\t') + '\n');
	return { directory, modules, compatibilityPath };
}
