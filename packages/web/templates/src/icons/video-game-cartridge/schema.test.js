import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/icons/video-game-cartridge/schema';

test('cartridge owns only an optional image asset key', () => {
	assert.equal(schema.name, 'video-game-cartridge');
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.equal(Value.Check(schema.fields, { image: 'cover-key' }), true);
	assert.equal(Value.Check(schema.fields, { image: 42 }), false);
	assert.equal(Value.Check(schema.fields, { variant: 'video' }), false);
});
