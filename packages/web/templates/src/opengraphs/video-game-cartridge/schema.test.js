import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { compile } from 'svelte/compiler';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/opengraphs/video-game-cartridge/schema';

test('cartridge fields are independently optional without invented defaults', () => {
	assert.equal(schema.name, 'video-game-cartridge');
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.deepEqual(Value.Default(schema.fields, {}), {});
	const fields = {
		image: 'label',
		publisher: 'Studio',
		platform: 'Console',
		playTimeMinutes: 125,
		backdrop: 'scene'
	};
	assert.equal(Value.Check(schema.fields, fields), true);
	for (const [key, value] of Object.entries(fields)) {
		assert.equal(Value.Check(schema.fields, { [key]: value }), true, key);
	}
	assert.equal(Value.Check(schema.fields, { playTimeMinutes: 0 }), true);
	assert.equal(Value.Check(schema.fields, { playTimeMinutes: 0.5 }), true);
});

test('cartridge rejects invalid values and legacy combined-game selectors', () => {
	for (const fields of [
		{ playTimeMinutes: -1 },
		{ playTimeMinutes: '60' },
		{ image: 42 },
		{ backdrop: null },
		{ publisher: [] },
		{ platform: 42 },
		{ type: 'video' },
		{ variant: 'video' },
		{ played_on: 'Console' },
		{ play_time: 60 }
	]) {
		assert.equal(Value.Check(schema.fields, fields), false, JSON.stringify(fields));
	}
});

test('cartridge compiles standalone for a relocated worker module', () => {
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
	assert.match(source, /fields\.backdrop \?\? fields\.image/);
	assert.match(source, /width: 1200px/);
	assert.match(source, /height: 630px/);
	assert.doesNotMatch(source, /background(?:-image)?:\s*url\(/);
});
