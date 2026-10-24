import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/opengraphs/lined-notebook-paper/schema';

test('lined-notebook-paper has no fields or invented defaults', () => {
	assert.equal(schema.name, 'lined-notebook-paper');
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.deepEqual(Value.Default(schema.fields, {}), {});
	assert.deepEqual(Object.keys(schema.fields.properties), []);
});

test('lined-notebook-paper takes normalized piece content, not mapped fields', () => {
	for (const fields of [
		{ title: 'A title' },
		{ summary: 'A summary' },
		{ note: 'A note' },
		{ wordCount: 1250 },
		{ dateConsumed: 0 },
		{ image: 'paper-key' }
	]) {
		assert.equal(Value.Check(schema.fields, fields), false);
	}
});
