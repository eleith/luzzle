import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/icons/code-snippet/schema';

test('snippet files contain asset keys and optional defaulted types, never mapped HTML', () => {
	assert.equal(schema.name, 'code-snippet');
	assert.equal(Value.Check(schema.fields, {}), true);
	const fields = Value.Default(schema.fields, { files: [{ file: 'source-key' }] });
	assert.deepEqual(fields, { files: [{ file: 'source-key', type: 'snippet' }] });
	assert.equal(Value.Check(schema.fields, fields), true);
	assert.equal(
		Value.Check(schema.fields, { files: [{ file: 'source-key', type: 'other' }] }),
		true
	);
	assert.equal(
		Value.Check(schema.fields, { files: [{ file: 'source-key', name: 'index.ts' }] }),
		false
	);
	assert.equal(
		Value.Check(schema.fields, { files: [{ file: 'source-key', format: 'ts' }] }),
		false
	);
	assert.equal(
		Value.Check(schema.fields, { files: [{ file: 'source-key', html: '<pre>unsafe</pre>' }] }),
		false
	);
	assert.equal(Value.Check(schema.fields, { files: [{ type: 'snippet' }] }), false);
});
