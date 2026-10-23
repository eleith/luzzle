import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/icons/book/schema';

test('book fields own their optional cover, author and page-count contract', () => {
	assert.equal(schema.name, 'book');
	const fields = Value.Default(schema.fields, { image: 'cover-key', author: 'Ada' });
	assert.deepEqual(fields, { image: 'cover-key', author: 'Ada', pages: 100 });
	assert.equal(Value.Check(schema.fields, fields), true);
	assert.equal(Value.Check(schema.fields, { pages: -1 }), false);
	assert.equal(Value.Check(schema.fields, { pages: 'many' }), false);
});
