import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/icons/recipe-card/schema';

test('recipe accepts only normalized ingredient items', () => {
	assert.equal(schema.name, 'recipe-card');
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.equal(
		Value.Check(schema.fields, { image: 'dish-key', ingredients: [{ item: 'flour' }] }),
		true
	);
	assert.equal(
		Value.Check(schema.fields, { ingredients: [{ item: 'flour', quantity: 2 }] }),
		false
	);
	assert.equal(
		Value.Check(schema.fields, { ingredients: [{ item: 'flour', unit: 'cups' }] }),
		false
	);
	assert.equal(
		Value.Check(schema.fields, { ingredients: [{ item: 'flour', note: 'sifted' }] }),
		false
	);
	assert.equal(Value.Check(schema.fields, { ingredients: [{}] }), false);
	assert.equal(Value.Check(schema.fields, { ingredients: ['flour'] }), false);
});
