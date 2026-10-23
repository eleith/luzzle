import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/icons/browser-window/schema';

test('article accepts optional image keys and display text, not archive-specific fields', () => {
	assert.equal(schema.name, 'browser-window');
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.equal(
		Value.Check(schema.fields, { image: 'banner-key', url: 'example.test/article' }),
		true
	);
	assert.equal(Value.Check(schema.fields, { url: 'Any display text' }), true);
	assert.equal(Value.Check(schema.fields, { image: 12 }), false);
	assert.equal(Value.Check(schema.fields, { url: 12 }), false);
	assert.equal(Value.Check(schema.fields, { representative_image: 'banner-key' }), false);
});
