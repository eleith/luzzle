import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/opengraphs/book/schema';

test('book OG fields are independently optional and do not invent page counts', () => {
	assert.equal(schema.name, 'book');
	assert.deepEqual(Value.Default(schema.fields, {}), {});
	assert.equal(Value.Check(schema.fields, { image: 'cover-key', author: 'Ada', pages: 320 }), true);
	assert.equal(Value.Check(schema.fields, { pages: -1 }), false);
	assert.equal(Value.Check(schema.fields, { director: 'Ada' }), false);
});
