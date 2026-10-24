import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/opengraphs/browser-window/schema';

test('browser-window fields are independently optional without invented defaults', () => {
	assert.equal(schema.name, 'browser-window');
	assert.deepEqual(Value.Default(schema.fields, {}), {});
	for (const fields of [
		{},
		{ image: 'banner-key' },
		{ url: 'https://example.com/story' },
		{ author: 'Ada' },
		{ wordCount: 0 },
		{ image: 'banner-key', url: 'https://example.com/story', author: 'Ada', wordCount: 1250 }
	]) {
		assert.equal(Value.Check(schema.fields, fields), true);
	}
});

test('browser-window rejects invalid counts, field types and metadata-shaped fields', () => {
	for (const fields of [
		{ wordCount: -1 },
		{ wordCount: '1250' },
		{ image: 42 },
		{ url: 42 },
		{ author: ['Ada'] },
		{ word_count: 1250 },
		{ representative_image: 'banner-key' }
	]) {
		assert.equal(Value.Check(schema.fields, fields), false);
	}
});
