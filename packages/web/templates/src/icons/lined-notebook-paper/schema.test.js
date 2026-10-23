import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/icons/lined-notebook-paper/schema';

test('paper has no fields because title and summary come from the normalized piece', () => {
	assert.equal(schema.name, 'lined-notebook-paper');
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.equal(Value.Check(schema.fields, { title: 'A title' }), false);
	assert.equal(Value.Check(schema.fields, { summary: 'A summary' }), false);
	assert.equal(Value.Check(schema.fields, { image: 'asset-key' }), false);
});
