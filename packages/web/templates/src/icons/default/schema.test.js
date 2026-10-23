import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/icons/default/schema';

test('the default icon has a poster image field, not book-specific fields', () => {
	assert.equal(schema.name, 'default');
	assert.match(schema.description, /poster/);
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.equal(Value.Check(schema.fields, { image: 'asset-key' }), true);
	assert.equal(Value.Check(schema.fields, { image: 100 }), false);
	assert.equal(Value.Check(schema.fields, { pages: 100 }), false);
});
