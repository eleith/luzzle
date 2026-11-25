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

test('retired names fail at the name field, even when a file is provided', () => {
	for (const role of ['icon', 'page', 'opengraph']) {
		for (const selection of [{ name: 'book' }, { name: 'book', file: './book.svelte' }]) {
			assert.throws(
				() => configure({ [role]: selection }),
				new RegExp(`/pieces/0/templates/${role}/name: .*default`)
			);
		}
	}
});

test('unsupported fields do not silently fall back', () => {
	assert.throws(
		() => configure({ icon: { mapping: { unsupported: 'metadata' } } }),
		/mapping\/unsupported/
	);
});

for (const role of ['icon', 'page', 'opengraph']) {
	test(`a local ${role} file accepts its own mappings and optional explicit default`, () => {
		const file = `./content/templates/${role}/example.svelte`;
		const mapping = { heading: { field: 'headline', default: 'Untitled' } };
		for (const selection of [
			{ file, mapping },
			{ file, name: 'default', mapping }
		]) {
			assert.deepEqual(configure({ [role]: selection })[role], { name: 'default', ...selection });
		}
		for (const invalid of [
			{ file, mapping: { heading: { expression: 'headline' } } },
			...[
				'',
				'example.js',
				'/tmp/template.svelte',
				'C:\\dir\\book.svelte',
				'https://host/template.svelte'
			].map((file) => ({ file }))
		])
			assert.throws(() => configure({ [role]: invalid }));
	});
}
