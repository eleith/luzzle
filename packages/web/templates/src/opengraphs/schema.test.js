import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateConfig } from '@luzzle/web.config';
import { configSchema } from '@luzzle/web.templates/config';
import { getOpengraphSchema, templates } from '@luzzle/web.templates/opengraphs/schema';

function configure(opengraph) {
	return validateConfig(
		{
			pieces: [
				{
					type: 'records',
					fields: { title: 'name', date_consumed: 'date' },
					templates: { opengraph }
				}
			]
		},
		{},
		{ schema: configSchema }
	);
}

test('the selected OG schema determines accepted field mappings', () => {
	assert.equal(
		configure({ name: 'book', mapping: { author: 'creator', pages: 'length' } }).pieces[0].templates
			.opengraph.name,
		'book'
	);
	assert.equal(
		configure({ name: 'poster', mapping: { director: 'creator', runtime: 'minutes' } }).pieces[0]
			.templates.opengraph.name,
		'poster'
	);
	assert.throws(() => configure({ name: 'book', mapping: { director: 'creator' } }));
	assert.throws(() => configure({ name: 'poster', mapping: { author: 'creator' } }));
	assert.equal(getOpengraphSchema().name, 'default');
	assert.deepEqual(
		templates.map((template) => template.name),
		[
			'default',
			'book',
			'browser-window',
			'code-snippet',
			'lined-notebook-paper',
			'playing-cards',
			'poster',
			'recipe-card',
			'video-game-cartridge',
			'vinyl-record'
		]
	);
	for (const template of templates)
		assert.equal(
			configure({ name: template.name }).pieces[0].templates.opengraph.name,
			template.name
		);
	for (const previous of ['article', 'paper', 'recipe', 'record', 'snippet', 'games', 'film'])
		assert.throws(() => configure({ name: previous }));
	assert.throws(() => getOpengraphSchema('../../owned.svelte'), /Unknown opengraph template/);
});
