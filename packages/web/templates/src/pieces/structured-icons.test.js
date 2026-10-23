import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapPieceTemplates } from '@luzzle/web.templates/pieces/fields';

const piece = {
	id: 'one',
	key: 'one',
	type: 'records',
	slug: 'one',
	title: 'An arbitrary record',
	date_added: 1,
	assets: [],
	metadata: {
		food: [{ label: 'Flour', amount: 2, measure: 'cups' }],
		sources: [
			{ asset: 'download-key', kind: 'attachment', filename: 'readme.txt' },
			{ asset: 'code-key', kind: 'snippet', language: 'js' }
		],
		cover: 'image-key'
	}
};

function configure(icon) {
	return { type: 'records', fields: { title: 'name', date_consumed: 'date' }, templates: { icon } };
}

test('recipe ingredients map names without changing the archive objects', () => {
	const result = mapPieceTemplates(
		piece,
		configure({
			name: 'recipe-card',
			mapping: {
				ingredients: { each: 'food', fields: { item: 'label' } }
			}
		})
	);
	assert.deepEqual(result.templates.icon.fields, { ingredients: [{ item: 'Flour' }] });
	assert.equal(result.metadata.food[0].amount, 2);
	assert.equal(result.templates.page.name, 'default');
	assert.equal(result.templates.opengraph.name, 'default');
});

test('snippet file mappings retain order and only expose normalized fields', () => {
	const result = mapPieceTemplates(
		piece,
		configure({
			name: 'code-snippet',
			mapping: {
				files: { each: 'sources', fields: { file: 'asset', type: 'kind' } }
			}
		})
	);
	assert.deepEqual(result.templates.icon.fields, {
		files: [
			{ file: 'download-key', type: 'attachment' },
			{ file: 'code-key', type: 'snippet' }
		]
	});
	assert.equal(result.metadata.sources[1].language, 'js');
});

test('cartridge and cards are distinct template choices, not a game variant switch', () => {
	const cartridge = mapPieceTemplates(
		piece,
		configure({ name: 'video-game-cartridge', mapping: { image: 'cover' } })
	);
	const cards = mapPieceTemplates(piece, configure({ name: 'playing-cards' }));
	assert.deepEqual(cartridge.templates.icon, {
		name: 'video-game-cartridge',
		fields: { image: 'image-key' }
	});
	assert.deepEqual(cards.templates.icon, { name: 'playing-cards', fields: {} });
});
