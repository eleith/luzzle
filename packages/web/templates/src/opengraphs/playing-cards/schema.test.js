import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compile } from 'svelte/compiler';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/opengraphs/playing-cards/schema';

test('playing cards own only optional backdrop, publisher and minute fields', () => {
	assert.equal(schema.name, 'playing-cards');
	assert.deepEqual(Object.keys(schema.fields.properties).sort(), [
		'backdrop',
		'playTimeMinutes',
		'publisher'
	]);
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.deepEqual(Value.Default(schema.fields, {}), {});
	const fields = { backdrop: 'scene', publisher: 'Studio', playTimeMinutes: 45 };
	assert.equal(Value.Check(schema.fields, fields), true);
	for (const [key, value] of Object.entries(fields)) {
		assert.equal(Value.Check(schema.fields, { [key]: value }), true, key);
	}
	assert.equal(Value.Check(schema.fields, { playTimeMinutes: 0 }), true);
	assert.equal(Value.Check(schema.fields, { playTimeMinutes: 0.5 }), true);
});

test('playing cards reject cartridge fields and combined-game selectors', () => {
	for (const fields of [
		{ playTimeMinutes: -1 },
		{ playTimeMinutes: '45' },
		{ backdrop: 42 },
		{ publisher: [] },
		{ image: 'label' },
		{ platform: 'Console' },
		{ type: 'tabletop' },
		{ variant: 'tabletop' },
		{ representative_image: 'scene' },
		{ play_time: 45 }
	]) {
		assert.equal(Value.Check(schema.fields, fields), false, JSON.stringify(fields));
	}
});

test('playing cards compile independently with inline paths for the worker', () => {
	const filename = new URL('./template.svelte', import.meta.url);
	const source = readFileSync(filename, 'utf8');
	const { js } = compile(source, { filename: filename.pathname, generate: 'server' });
	const imports = [...js.code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
	assert.ok(imports.includes('@luzzle/web.pieces'));
	assert.ok(
		imports.every(
			(specifier) => specifier === '@luzzle/web.pieces' || specifier.startsWith('svelte/')
		)
	);
	assert.doesNotMatch(js.code, /piece\.metadata|piece\.type|schema\.js/);
	assert.doesNotMatch(source, /<use\b|<symbol\b|cartridge|background(?:-image)?:\s*url\(/);
	assert.match(source, /<path d=\{symbolPath\}/);
	assert.match(source, /width: 1200px/);
	assert.match(source, /height: 630px/);
});
