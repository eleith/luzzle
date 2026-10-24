import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/pages/recipe/schema';

test('recipe has bounded ingredient/step data and explicit timing units', () => {
	assert.equal(
		Value.Check(schema.fields, {
			ingredients: [{ item: 'Flour', quantity: '1/2', unit: 'cup' }],
			instructions: ['<p>Stir</p>', { html: '<p>Cook</p>' }, { text: 'Cool <slowly>' }],
			prepMinutes: 0,
			cookMinutes: 10
		}),
		true
	);
	assert.equal(Value.Check(schema.fields, { ingredients: [{ label: 'not mapped' }] }), false);
	assert.equal(
		Value.Check(schema.fields, { instructions: [{ text: 'one', html: '<p>two</p>' }] }),
		false
	);
	assert.equal(Value.Check(schema.fields, { cookMinutes: -1 }), false);
});
