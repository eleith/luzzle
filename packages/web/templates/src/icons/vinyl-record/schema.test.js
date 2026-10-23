import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/icons/vinyl-record/schema';

test('record accepts only an optional label image asset key', () => {
	assert.equal(schema.name, 'vinyl-record');
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.equal(Value.Check(schema.fields, { image: 'label-key' }), true);
	assert.equal(Value.Check(schema.fields, { image: 12 }), false);
	assert.equal(Value.Check(schema.fields, { cover_art: 'label-key' }), false);
});
