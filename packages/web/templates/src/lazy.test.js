import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadPage } from '@luzzle/web.templates/pages/lazy';
import { loadIcon } from '@luzzle/web.templates/icons/lazy';

for (const [role, load] of [
	['page', loadPage],
	['icon', loadIcon]
]) {
	test(`${role} lazy entry rejects unknown and inherited names without importing templates`, async () => {
		for (const name of ['missing', 'constructor', 'toString', '__proto__', '../default']) {
			await assert.rejects(load(name), {
				message: `Unknown ${role} template: ${name}`
			});
		}
	});
}
