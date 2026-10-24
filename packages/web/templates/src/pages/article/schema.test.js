import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/pages/article/schema';

test('article page fields are optional with active, non-paywalled link defaults', () => {
	assert.equal(schema.name, 'article');
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.deepEqual(Value.Default(schema.fields, {}), { isActive: true, isPaywalled: false });
	assert.deepEqual(Value.Default(schema.fields, { isActive: false, isPaywalled: true }), {
		isActive: false,
		isPaywalled: true
	});
	assert.equal(
		Value.Check(schema.fields, {
			image: 'article-banner',
			url: 'https://example.com/story',
			author: 'Ada',
			wordCount: 0,
			datePublished: 0,
			isActive: false,
			isPaywalled: true
		}),
		true
	);
	assert.equal(Value.Check(schema.fields, { datePublished: '2025-01-02', wordCount: 251.5 }), true);
});

test('article page fields reject implicit metadata and invalid mapped types', () => {
	for (const fields of [
		{ wordCount: -1 },
		{ wordCount: '250' },
		{ datePublished: false },
		{ isActive: 'false' },
		{ isPaywalled: 1 },
		{ author: ['Ada'] },
		{ word_count: 250 },
		{ representative_image: 'banner' }
	]) {
		assert.equal(Value.Check(schema.fields, fields), false);
	}
});
