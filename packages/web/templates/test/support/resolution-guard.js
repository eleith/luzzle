import { realpathSync } from 'node:fs';
import { isBuiltin, registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Native Node guard, not a Vite resolver. Also rejects symlink escapes/ancestor fallback. */
export function registerResolutionGuard(directory) {
	const root = realpathSync(directory);
	return registerHooks({
		resolve(specifier, context, nextResolve) {
			const resolved = nextResolve(specifier, context);
			if (isBuiltin(resolved.url)) return resolved;
			if (!resolved.url.startsWith('file:')) {
				throw new Error(`Isolation guard rejected non-file import: ${resolved.url}`);
			}
			const filename = realpathSync(fileURLToPath(resolved.url));
			const relative = path.relative(root, filename);
			if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
				throw new Error(`Isolation guard rejected import outside isolated root: ${filename}`);
			}
			return resolved;
		}
	});
}
