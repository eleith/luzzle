import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/opengraphs/recipe-card/schema';

test('recipe OG accepts normalized ingredient names and explicit timing units', () => {
	assert.equal(
		Value.Check(schema.fields, {
			ingredients: [{ item: 'Flour' }],
			prepMinutes: 0,
			cookMinutes: 10
		}),
		true
	);
	assert.equal(Value.Check(schema.fields, { ingredients: [{ label: 'not mapped' }] }), false);
	assert.equal(Value.Check(schema.fields, { cookMinutes: -1 }), false);
	assert.equal(
		Value.Check(schema.fields, { ingredients: [{ item: 'Flour', quantity: 2 }] }),
		false
	);
});
