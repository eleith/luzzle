import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/pages/book/schema';

test('book pages own their display fields without inventing a page count', () => {
	assert.equal(schema.name, 'book');
	assert.deepEqual(Value.Default(schema.fields, {}), {});
	assert.equal(
		Value.Check(schema.fields, { author: 'Ada', pages: 320, publicationYear: -400 }),
		true
	);
	assert.equal(Value.Check(schema.fields, { pages: -1 }), false);
	assert.equal(Value.Check(schema.fields, { pages: 'many' }), false);
	assert.equal(Value.Check(schema.fields, { runtime: 90 }), false);
});
