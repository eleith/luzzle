import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateConfig } from '@luzzle/web.config';
import { configSchema } from '@luzzle/web.templates/config';
import { getIconSchema } from '../../dist/icons/schema.js';

function configure(icon) {
	return validateConfig(
		{
			pieces: [
				{
					type: 'inventory',
					fields: { title: 'name', date_consumed: 'date' },
					templates: { icon }
				}
			]
		},
		{},
		{ schema: configSchema }
	);
}

test('configuration exposes the supported mappings of the selected icon', () => {
	assert.equal(
		configure({ name: 'book', mapping: { pages: 'edition.length' } }).pieces[0].templates.icon.name,
		'book'
	);
	assert.throws(() => configure({ name: 'poster', mapping: { pages: 'edition.length' } }));
	assert.throws(() => configure({ name: 'default', mapping: { author: 'creator' } }));
	assert.throws(() => configure({ name: 'not-a-template' }));
	assert.equal(getIconSchema().name, 'default');
	assert.equal(getIconSchema('book').name, 'book');
	assert.equal(getIconSchema('playing-cards').name, 'playing-cards');
	assert.equal(getIconSchema('video-game-cartridge').name, 'video-game-cartridge');
	assert.throws(() => configure({ name: 'games' }));
	assert.throws(() => configure({ name: 'video-game-cartridge', mapping: { variant: 'kind' } }));
	assert.throws(() => configure({ name: 'playing-cards', mapping: { image: 'cover' } }));
	assert.throws(() => getIconSchema('not-a-template'), /Unknown icon template/);
	for (const previous of [
		'article',
		'cards',
		'cartridge',
		'paper',
		'recipe',
		'record',
		'snippet',
		'games'
	]) {
		assert.throws(() => configure({ name: previous }));
	}
});
