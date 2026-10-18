import { createHash } from 'node:crypto';
import { isBuiltin } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { compile, VERSION } from 'svelte/compiler';
import { compilerOptions } from './build/options.js';
import { normalizeCryptoImport } from './build/normalize-crypto.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const virtualId = '\0template-compatibility';
const fingerprintToken = '__LUZZLE_RUNTIME_GRAPH_SHA256__';
const metadata = {
	schemaVersion: 1,
	compiler: { name: 'svelte', version: VERSION, options: compilerOptions },
	build: {
		packageVersion: manifest.version,
		rollup: manifest.devDependencies.rollup,
		nodeResolve: manifest.devDependencies['@rollup/plugin-node-resolve'],
		conditions: ['node', 'production']
	},
	runtimeFingerprint: fingerprintToken
};

function releaseGraph() {
	return {
		name: 'luzzle-template-release-graph',
		async buildStart() {
			if (VERSION !== manifest.devDependencies.svelte) {
				this.error(`Expected Svelte ${manifest.devDependencies.svelte}, found ${VERSION}`);
			}
			await rm(path.join(root, 'dist'), { recursive: true, force: true });
		},
		resolveId(id) {
			if (id === 'virtual:template-compatibility') return virtualId;
		},
		load(id) {
			if (id === virtualId) return `export default ${JSON.stringify(metadata)};`;
		},
		transform(source, id) {
			if (/[/\\]svelte[/\\]src[/\\]internal[/\\]server[/\\]crypto\.js$/.test(id)) {
				return { code: normalizeCryptoImport(source), map: null };
			}
			if (!id.endsWith('.svelte')) return null;
			const filename = path.relative(root, id).split(path.sep).join('/');
			const result = compile(source, { ...compilerOptions, filename });
			for (const warning of result.warnings) this.warn(warning.message);
			return { code: result.js.code, map: null };
		},
		generateBundle(_options, bundle) {
			const chunks = Object.values(bundle)
				.filter((file) => file.type === 'chunk')
				.sort((a, b) => a.fileName.localeCompare(b.fileName, 'en'));
			for (const chunk of chunks) {
				for (const id of Object.keys(chunk.modules)) {
					if (/[/\\]svelte[/\\](?:src[/\\])?compiler[/\\]/.test(id)) {
						this.error(`Compiler entered the runtime graph: ${id}`);
					}
					if (
						/[/\\]node_modules[/\\](?:typescript|rollup|vite|esbuild|acorn|magic-string)[/\\]/.test(
							id
						)
					) {
						this.error(`Build tool entered the runtime graph: ${id}`);
					}
				}
				for (const id of [...chunk.imports, ...chunk.dynamicImports]) {
					if (!bundle[id] && !isBuiltin(id)) this.error(`Unbundled runtime import: ${id}`);
				}
			}
			// Hash the complete emitted graph with an invariant placeholder. Neither
			// absolute source paths nor timestamps enter the fingerprint or output.
			const hash = createHash('sha256');
			for (const chunk of chunks) hash.update(chunk.fileName).update('\0').update(chunk.code);
			const runtimeFingerprint = hash.digest('hex');
			for (const chunk of chunks) {
				chunk.code = chunk.code.replaceAll(fingerprintToken, runtimeFingerprint);
			}
			this.emitFile({
				type: 'asset',
				fileName: 'compatibility.json',
				source: JSON.stringify({ ...metadata, runtimeFingerprint }, null, '\t') + '\n'
			});
		}
	};
}

export default {
	input: {
		index: path.join(root, 'src/index.js'),
		components: path.join(root, 'src/components.js'),
		compatibility: path.join(root, 'src/compatibility.js'),
		'runtime/svelte': path.join(root, 'src/runtime/svelte.js'),
		'runtime/internal-server': path.join(root, 'src/runtime/internal-server.js'),
		'runtime/server': path.join(root, 'src/runtime/server.js')
	},
	preserveEntrySignatures: 'strict',
	external: (id) => isBuiltin(id),
	plugins: [
		releaseGraph(),
		nodeResolve({ exportConditions: ['node', 'production'], browser: false, preferBuiltins: true })
	],
	onwarn(warning) {
		// Svelte's server renderer/index/context intentionally form ESM cycles.
		// Do not hide unresolved imports or cycles involving our own modules.
		if (
			warning.code === 'CIRCULAR_DEPENDENCY' &&
			warning.ids?.every((id) => id.split(path.sep).join('/').includes('/node_modules/svelte/src/'))
		)
			return;
		throw new Error(warning.message);
	},
	output: {
		dir: path.join(root, 'dist'),
		format: 'esm',
		entryFileNames: '[name].js',
		chunkFileNames: 'chunks/[name]-[hash].js',
		sourcemap: false
	}
};
