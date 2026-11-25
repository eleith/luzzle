import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateConfig } from '@luzzle/web.config';
import { configSchema } from '@luzzle/web.templates/config';

function configure(templates) {
	return validateConfig(
		{
			pieces: {
				'arbitrary-records': {
					fields: { title: 'name', date_consumed: 'date' },
					...(templates === undefined ? {} : { templates })
				}
			}
		},
		{},
		{ schema: configSchema }
	).pieces['arbitrary-records'].templates;
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
				new RegExp(`/pieces/arbitrary-records/templates/${role}/name: .*default`)
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
	test(`a local ${role} file accepts its own mapping`, () => {
		const selection = {
			file: `./content/templates/${role}/example.svelte`,
			mapping: { heading: { field: 'headline', default: 'Untitled' } }
		};
		assert.deepEqual(configure({ [role]: selection })[role], { name: 'default', ...selection });
	});
}

test('a local file accepts an explicit default name', () => {
	const icon = { file: './icon.svelte', name: 'default' };
	assert.deepEqual(configure({ icon }).icon, icon);
});

test('a local file rejects invalid mappings and paths', () => {
	assert.throws(() =>
		configure({ icon: { file: './icon.svelte', mapping: { heading: { expression: 'headline' } } } })
	);
	for (const file of [
		'',
		'example.js',
		'/tmp/template.svelte',
		'C:\\dir\\book.svelte',
		'https://host/template.svelte'
	]) {
		assert.throws(() => configure({ icon: { file } }));
	}
});
