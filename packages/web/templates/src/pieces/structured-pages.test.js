import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapPieceTemplates } from '@luzzle/web.templates/pieces/fields';

const piece = {
	id: 'one',
	key: 'one',
	type: 'inventory',
	slug: 'one',
	title: 'An arbitrary record',
	date_added: 1,
	assets: [],
	metadata: {
		materials: [{ label: 'Flour', amount: '1/2', measure: 'cup', extra: 'kept' }],
		directions: [{ content: '<p>Mix</p>' }, { content: '<p>Bake</p>' }],
		timing: { setup: 2, heating: 10 },
		sources: [
			{ key: 'source-key', filename: 'example.js', language: 'javascript', kind: 'snippet' },
			{ key: 'attachment-key', filename: 'data.csv', language: 'csv', kind: 'attachment' }
		],
		game: { players: 2, platform: 'Console', minutes: 90 }
	}
};

function configure(page) {
	return {
		type: 'inventory',
		fields: { title: 'name', date_consumed: 'date' },
		templates: {
			icon: { name: 'lined-notebook-paper' },
			page,
			opengraph: { name: 'default' }
		}
	};
}

test('recipe array-item fields retain order and leave original metadata alone', () => {
	const mapped = mapPieceTemplates(
		piece,
		configure({
			name: 'recipe',
			mapping: {
				ingredients: {
					each: 'materials',
					fields: { item: 'label', quantity: 'amount', unit: 'measure' }
				},
				instructions: { each: 'directions', fields: { html: 'content' } },
				prepMinutes: 'timing.setup',
				cookMinutes: 'timing.heating'
			}
		})
	);
	assert.deepEqual(mapped.templates.page.fields, {
		ingredients: [{ item: 'Flour', quantity: '1/2', unit: 'cup' }],
		instructions: [{ html: '<p>Mix</p>' }, { html: '<p>Bake</p>' }],
		prepMinutes: 2,
		cookMinutes: 10
	});
	assert.equal(mapped.metadata.materials[0].extra, 'kept');
	assert.equal(mapped.templates.icon.name, 'lined-notebook-paper');
	assert.equal(mapped.templates.opengraph.name, 'default');
});

test('snippet file labels and asset keys map independently of archive names', () => {
	const mapped = mapPieceTemplates(
		piece,
		configure({
			name: 'snippet',
			mapping: {
				files: {
					each: 'sources',
					fields: { file: 'key', name: 'filename', format: 'language', type: 'kind' }
				}
			}
		})
	);
	assert.deepEqual(mapped.templates.page.fields, {
		files: [
			{ file: 'source-key', name: 'example.js', format: 'javascript', type: 'snippet' },
			{ file: 'attachment-key', name: 'data.csv', format: 'csv', type: 'attachment' }
		]
	});
});

test('video and tabletop games are distinct field contracts, not a type switch', () => {
	const video = mapPieceTemplates(
		piece,
		configure({
			name: 'video-game',
			mapping: {
				platform: 'game.platform',
				playTimeMinutes: 'game.minutes'
			}
		})
	);
	const tabletop = mapPieceTemplates(
		piece,
		configure({
			name: 'tabletop-game',
			mapping: {
				playerCount: 'game.players',
				playTimeMinutes: 'game.minutes'
			}
		})
	);
	assert.deepEqual(video.templates.page.fields, { platform: 'Console', playTimeMinutes: 90 });
	assert.deepEqual(tabletop.templates.page.fields, { playerCount: 2, playTimeMinutes: 90 });
});
