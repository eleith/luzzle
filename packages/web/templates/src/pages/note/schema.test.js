import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/pages/note/schema';

test('note pages have no mapped fields', () => {
	assert.equal(schema.name, 'note');
	assert.deepEqual(Value.Default(schema.fields, {}), {});
	assert.equal(Value.Check(schema.fields, {}), true);
	for (const fields of [
		{ title: 'A note' },
		{ note: 'Text' },
		{ image: 'banner' },
		{ author: 'Ada' }
	]) {
		assert.equal(Value.Check(schema.fields, fields), false);
	}
});
