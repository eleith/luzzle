import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { createTemplateSelectionSchema } from '../../dist/config/association.js';

const fallback = { name: 'default', description: 'Fallback', fields: Type.Object({}) };
const schema = createTemplateSelectionSchema('icon', [
	fallback,
	{
		name: 'custom',
		description: 'A test icon',
		fields: Type.Object({ image: Type.Optional(Type.String()) })
	}
]);

test('a role catalog supplies its own names and supported fields', () => {
	assert.equal(Value.Check(schema, { name: 'custom', mapping: { image: 'art.cover' } }), true);
	assert.equal(Value.Check(schema, { name: 'unknown' }), false);
	assert.equal(Value.Check(schema, { name: 'custom', mapping: { unknown: 'metadata' } }), false);
});

test('each role requires an independent default', () => {
	assert.throws(() => createTemplateSelectionSchema('icon', []), /must include "default"/);
});

test('template associations reject invalid bindings and source paths', () => {
	for (const association of [
		{ name: 'custom', source: './custom.svelte' },
		{ name: 'custom', mapping: { image: {} } },
		{ name: 'custom', mapping: { image: { field: 'cover', value: 'both' } } },
		{ name: 'custom', mapping: { image: { expression: 'metadata.cover' } } },
		{ name: 'custom', mapping: { image: { each: 'items' } } }
	])
		assert.equal(Value.Check(schema, association), false);
});
