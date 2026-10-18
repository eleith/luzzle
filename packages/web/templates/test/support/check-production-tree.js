import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

// Check bytes on disk too: an unused dev dependency can evade a rendering test.
export async function checkProductionTree(directory) {
	const root = await realpath(directory);
	const visited = new Set();
	async function visit(filename) {
		const resolved = await realpath(filename);
		const relative = path.relative(root, resolved);
		if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
			throw new Error(`Production tree escapes isolated root: ${filename}`);
		}
		if (visited.has(resolved)) return;
		visited.add(resolved);
		if ((await stat(resolved)).isDirectory()) {
			for (const name of await readdir(resolved)) await visit(path.join(resolved, name));
		} else if (path.basename(resolved) === 'package.json') {
			const manifest = JSON.parse(await readFile(resolved, 'utf8'));
			if (manifest.name && manifest.name !== '@luzzle/web.templates') {
				throw new Error(`Unexpected production dependency: ${manifest.name}`);
			}
		}
	}
	await visit(path.join(root, 'node_modules'));
}
