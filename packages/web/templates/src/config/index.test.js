import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateConfig } from '@luzzle/web.config';
import { configSchema } from '@luzzle/web.templates/config';

function configure(templates) {
	return validateConfig(
		{
			pieces: [
				{
					type: 'arbitrary-records',
					fields: { title: 'name', date_consumed: 'date' },
					...(templates === undefined ? {} : { templates })
				}
			]
		},
		{},
		{ schema: configSchema }
	).pieces[0].templates;
}

test('every unspecified role uses default', () => {
	assert.deepEqual(configure(), {
		icon: { name: 'default' },
		page: { name: 'default' },
		opengraph: { name: 'default' }
	});
});

test('mapped associations remain independent from other role defaults', () => {
	assert.deepEqual(configure({ icon: { name: 'default', mapping: { image: 'art.front' } } }), {
		icon: { name: 'default', mapping: { image: 'art.front' } },
		page: { name: 'default' },
		opengraph: { name: 'default' }
	});
});

test('a default association can supply its own mapping without a name', () => {
	assert.deepEqual(configure({ icon: { mapping: { image: 'media.cover' } } }).icon, {
		name: 'default',
		mapping: { image: 'media.cover' }
	});
});

test('unknown explicit names and unsupported fields do not silently fall back', () => {
	for (const templates of [
		{ icon: { name: 'not-a-template' } },
		{ opengraph: { name: 'not-a-template' } },
		{ page: { name: 'generic' } },
		{ icon: { name: 'default', mapping: { unsupported: 'metadata' } } }
	])
		assert.throws(() => configure(templates));
});

test('a local icon file accepts its own field names, with an optional built-in fallback', () => {
	const file = './content/templates/icon/example.svelte';
	const mapping = { heading: { field: 'headline', default: 'Untitled' } };
	for (const icon of [
		{ file, mapping },
		{ file, name: 'book', mapping }
	]) {
		assert.deepEqual(configure({ icon }).icon, { name: 'default', ...icon });
	}
	for (const invalid of [
		{ icon: { file, name: 'unknown' } },
		{ icon: { file, mapping: { heading: { expression: 'headline' } } } },
		{ page: { file } },
		{ opengraph: { file } },
		...[
			'',
			'example.js',
			'/tmp/icon.svelte',
			'C:\\icons\\book.svelte',
			'https://host/icon.svelte'
		].map((file) => ({ icon: { file } }))
	])
		assert.throws(() => configure(invalid));
});
