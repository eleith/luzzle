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
		{ icon: { name: 'book' } },
		{ opengraph: { name: 'poster' } },
		{ page: { name: 'generic' } },
		{ icon: { name: 'default', mapping: { unsupported: 'metadata' } } }
	])
		assert.throws(() => configure(templates));
});
