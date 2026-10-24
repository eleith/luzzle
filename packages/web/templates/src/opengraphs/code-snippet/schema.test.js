import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/opengraphs/code-snippet/schema';

test('code-snippet OG files are optional and default only the nested file type', () => {
	assert.equal(schema.name, 'code-snippet');
	assert.deepEqual(Value.Default(schema.fields, {}), {});
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.equal(Value.Check(schema.fields, { files: [] }), true);
	assert.equal(Value.Check(schema.fields, { files: [{ file: 'source-key' }] }), true);
	const fields = Value.Default(schema.fields, {
		files: [
			{ file: 'notes-key', type: 'attachment', format: 'txt' },
			{ file: 'first-source', format: 'js' },
			{ file: 'second-source', type: 'snippet', format: 'ts' }
		]
	});
	assert.deepEqual(fields, {
		files: [
			{ file: 'notes-key', type: 'attachment', format: 'txt' },
			{ file: 'first-source', type: 'snippet', format: 'js' },
			{ file: 'second-source', type: 'snippet', format: 'ts' }
		]
	});
	assert.equal(Value.Check(schema.fields, fields), true);
	assert.equal(fields.files.find((file) => file.type === 'snippet').file, 'first-source');
});

test('code-snippet OG files accept asset keys, not mapped HTML or arbitrary metadata', () => {
	for (const fields of [
		{ files: 'source-key' },
		{ files: [{ format: 'js' }] },
		{ files: [{ file: 1 }] },
		{ files: [{ file: 'source-key', type: 1 }] },
		{ files: [{ file: 'source-key', format: 1 }] },
		{ files: [{ file: 'source-key', highlight: '<pre>unsafe</pre>' }] },
		{ files: [{ file: 'source-key', content: '<pre>unsafe</pre>' }] },
		{ html: '<pre>unsafe</pre>' }
	]) {
		assert.equal(Value.Check(schema.fields, fields), false);
	}
});
