import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ConfigError } from '@luzzle/web.config';
import { loadConfig } from '@luzzle/web.templates/config';

function withConfig(templates, run) {
	const cache = fileURLToPath(new URL('../../node_modules/.cache/', import.meta.url));
	mkdirSync(cache, { recursive: true });
	const directory = mkdtempSync(path.join(cache, 'selectors-'));
	const filename = path.join(directory, 'config.yaml');
	try {
		writeFileSync(
			filename,
			JSON.stringify({
				pieces: [
					{
						type: 'records',
						fields: { title: 'title', date_consumed: 'date' },
						templates
					}
				]
			})
		);
		return run(filename);
	} finally {
		rmSync(directory, { recursive: true, force: true });
	}
}

test('loading rejects malformed selectors before any piece is hydrated', () => {
	for (const mapping of [
		{ image: '[' },
		{ image: { field: '[' } },
		{ people: { each: '[', fields: { name: 'display' } } },
		{ people: { each: 'credits', fields: { name: '[' } } }
	]) {
		withConfig({ page: { name: 'default', mapping } }, (filename) => {
			assert.throws(
				() => loadConfig(filename),
				(error) => {
					assert.ok(error instanceof ConfigError);
					assert.match(error.issues[0].path, /^\/pieces\/0\/templates\/page\/mapping\//);
					return true;
				}
			);
		});
	}
});

test('valid nested selectors and literal text use their distinct meanings', () => {
	withConfig(
		{
			page: {
				mapping: {
					image: 'art["poster"]',
					category: { value: '[' },
					people: { each: 'credits', fields: { name: 'display' } }
				}
			}
		},
		(filename) => {
			assert.equal(loadConfig(filename).pieces[0].templates.page.mapping.category.value, '[');
		}
	);
});
