import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from './schema.ts';

test('snippet fields may be absent, and files default to snippet display', () => {
	assert.equal(schema.name, 'snippet');
	assert.equal(Value.Check(schema.fields, {}), true);
	const fields = Value.Default(schema.fields, { files: [{ file: 'asset-key' }] });
	assert.deepEqual(fields, { files: [{ file: 'asset-key', type: 'snippet' }] });
	assert.equal(Value.Check(schema.fields, fields), true);
});

test('snippet accepts ordered normalized files including duplicate display names and attachments', () => {
	const files = [
		{ file: 'one', name: 'same', format: 'js' },
		{ file: 'two', name: 'same', format: 'js', type: 'snippet' },
		{ file: 'archive', type: 'attachment' }
	];
	assert.equal(Value.Check(schema.fields, { files, dateUpdated: 0 }), true);
	assert.equal(Value.Check(schema.fields, { files, dateUpdated: '2025-01-02' }), true);
	assert.equal(Value.Check(schema.fields, { files: [{ name: 'missing asset' }] }), false);
	assert.equal(
		Value.Check(schema.fields, { files: [{ file: 'one', highlight: '<b>unsafe</b>' }] }),
		false
	);
	assert.equal(Value.Check(schema.fields, { date_updated: 0 }), false);
});
