import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveTemplateFields } from '@luzzle/web.templates/mapping';

const metadata = {
	creator: { name: 'Ada' },
	stats: { pages: 0 },
	recipe: { items: [{ name: 'Flour', amount: 2 }, { name: 'Salt' }] },
	authors: ['Ada', 'Grace']
};

test('maps arbitrary metadata with paths, constants and missing-value defaults', () => {
	assert.deepEqual(
		resolveTemplateFields(metadata, {
			author: 'creator.name',
			label: { value: 'A record' },
			pages: { field: 'stats.pages', default: 100 },
			omitted: undefined,
			missing: 'unknown',
			fallback: { field: 'unknown', default: 'Unknown' }
		}),
		{ author: 'Ada', label: 'A record', pages: 0, fallback: 'Unknown' }
	);
});

test('maps nested objects and array items without changing item order', () => {
	assert.deepEqual(
		resolveTemplateFields(metadata, {
			source: { fields: { name: 'creator.name' } },
			ingredients: { each: 'recipe.items', fields: { item: 'name', quantity: 'amount' } },
			contributors: { each: 'authors', fields: { name: '$' } }
		}),
		{
			source: { name: 'Ada' },
			ingredients: [{ item: 'Flour', quantity: 2 }, { item: 'Salt' }],
			contributors: [{ name: 'Ada' }, { name: 'Grace' }]
		}
	);
});

test('returns detached data, including constants and default values', () => {
	const constant = { labels: ['first'] };
	const fallback = ['default'];
	const result = resolveTemplateFields(metadata, {
		creator: 'creator',
		literal: { value: constant },
		fallback: { field: 'missing', default: fallback }
	});
	result.creator.name = 'Changed';
	result.literal.labels.push('changed');
	result.fallback.push('changed');
	assert.equal(metadata.creator.name, 'Ada');
	assert.deepEqual(constant.labels, ['first']);
	assert.deepEqual(fallback, ['default']);
});

test('missing collections are empty; a non-array collection reports the field name', () => {
	assert.deepEqual(
		resolveTemplateFields(
			{},
			{
				ingredients: { each: 'items', fields: { name: 'name' } }
			}
		),
		{ ingredients: [] }
	);
	assert.throws(
		() =>
			resolveTemplateFields(
				{ items: 3 },
				{
					ingredients: { each: 'items', fields: { name: 'name' } }
				}
			),
		/Template field "ingredients" expects an array at "items"/
	);
});

test('reserved field names remain ordinary own properties', () => {
	const mapping = JSON.parse('{"__proto__":{"value":"safe"},"constructor":{"value":"also safe"}}');
	const result = resolveTemplateFields({}, mapping);
	assert.equal(Object.hasOwn(result, '__proto__'), true);
	assert.equal(Object.hasOwn(result, 'constructor'), true);
	assert.equal(Object.getPrototypeOf(result), Object.prototype);
});
