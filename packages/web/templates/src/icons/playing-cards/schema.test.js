import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/icons/playing-cards/schema';

test('cards has an empty field contract without an image or variant', () => {
	assert.equal(schema.name, 'playing-cards');
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.deepEqual(Value.Default(schema.fields, {}), {});
	assert.equal(Value.Check(schema.fields, { image: 'cover-key' }), false);
	assert.equal(Value.Check(schema.fields, { variant: 'cards' }), false);
	assert.equal(Value.Check(schema.fields, { tags: ['strategy'] }), false);
});
