import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Type } from '@sinclair/typebox';
import {
	mapTemplateFields,
	resolveTemplateFields,
	TemplateFieldsError
} from '@luzzle/web.templates/mapping';

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

test('null metadata is missing, while zero, false and empty text remain values', () => {
	const source = { cover: 'cover-key', backdrop: null, count: 0, active: false, label: '' };
	assert.deepEqual(
		resolveTemplateFields(source, {
			image: 'cover',
			backdrop: 'backdrop',
			fallback: { field: 'backdrop', default: 'No backdrop' },
			count: 'count',
			active: 'active',
			label: 'label'
		}),
		{ image: 'cover-key', fallback: 'No backdrop', count: 0, active: false, label: '' }
	);
	assert.equal(source.backdrop, null);
});

test('null metadata receives schema defaults without discarding valid fields', () => {
	const schema = Type.Object({
		image: Type.String(),
		pages: Type.Optional(Type.Number({ default: 100 })),
		backdrop: Type.Optional(Type.String())
	});
	assert.deepEqual(
		mapTemplateFields(
			schema,
			{ cover: 'cover-key', pages: null, backdrop: null },
			{ image: 'cover', pages: 'pages', backdrop: 'backdrop' }
		),
		{ image: 'cover-key', pages: 100 }
	);
	for (const cover of [null, 42]) {
		assert.throws(
			() => mapTemplateFields(schema, { cover }, { image: 'cover' }),
			TemplateFieldsError
		);
	}
});

test('explicit null constants and defaults are preserved and validated', () => {
	const nullable = Type.Object({ label: Type.Null() });
	assert.deepEqual(mapTemplateFields(nullable, {}, { label: { value: null } }), { label: null });
	assert.deepEqual(
		mapTemplateFields(nullable, { label: null }, { label: { field: 'label', default: null } }),
		{ label: null }
	);
	assert.throws(
		() =>
			mapTemplateFields(
				Type.Object({ label: Type.Optional(Type.String()) }),
				{},
				{ label: { value: null } }
			),
		TemplateFieldsError
	);
});

test('null fields inside structured mappings are omitted without changing item order', () => {
	const source = {
		creator: { name: 'Ada', url: null },
		items: [
			{ file: 'one', name: null },
			{ file: 'two', name: 'Second' }
		],
		authors: [null, 'Ada']
	};
	assert.deepEqual(
		resolveTemplateFields(source, {
			creator: { fields: { name: 'creator.name', url: 'creator.url' } },
			files: { each: 'items', fields: { file: 'file', name: 'name' } },
			contributors: { each: 'authors', fields: { name: '$' } }
		}),
		{
			creator: { name: 'Ada' },
			files: [{ file: 'one' }, { file: 'two', name: 'Second' }],
			contributors: [{}, { name: 'Ada' }]
		}
	);
	assert.equal(source.items[0].name, null);
	assert.equal(source.authors[0], null);
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

test('missing and null collections are empty; non-array values report the field name', () => {
	for (const source of [{}, { items: null }]) {
		assert.deepEqual(
			resolveTemplateFields(source, {
				ingredients: { each: 'items', fields: { name: 'name' } }
			}),
			{ ingredients: [] }
		);
	}
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
