import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mapOpengraphTemplate } from '@luzzle/web.templates/pieces/fields';

const piece = {
	id: 'one',
	key: 'one',
	type: 'inventory',
	slug: 'one',
	title: 'An arbitrary record',
	date_added: 1,
	assets: [],
	metadata: {
		art: 'image-key',
		sourceName: 'A kitchen',
		materials: [{ label: 'Flour', amount: 2 }],
		timing: { setup: 2, heating: 10 },
		files: [{ key: 'source-key', language: 'javascript', kind: 'snippet', extra: 'kept' }],
		game: { publisher: 'A studio', platform: 'Console', minutes: 90 }
	}
};
function configure(opengraph) {
	return {
		type: 'inventory',
		fields: { title: 'name', date_consumed: 'date' },
		templates: { opengraph }
	};
}

test('recipe OG fields normalize ingredient objects without rewriting metadata', () => {
	assert.deepEqual(
		mapOpengraphTemplate(
			piece,
			configure({
				name: 'recipe-card',
				mapping: {
					image: 'art',
					source: 'sourceName',
					ingredients: { each: 'materials', fields: { item: 'label' } },
					prepMinutes: 'timing.setup',
					cookMinutes: 'timing.heating'
				}
			})
		),
		{
			name: 'recipe-card',
			fields: {
				image: 'image-key',
				source: 'A kitchen',
				ingredients: [{ item: 'Flour' }],
				prepMinutes: 2,
				cookMinutes: 10
			}
		}
	);
	assert.equal(piece.metadata.materials[0].amount, 2);
});

test('code OG file data remains ordered and bounded independently of file metadata', () => {
	assert.deepEqual(
		mapOpengraphTemplate(
			piece,
			configure({
				name: 'code-snippet',
				mapping: {
					files: { each: 'files', fields: { file: 'key', type: 'kind', format: 'language' } }
				}
			})
		),
		{
			name: 'code-snippet',
			fields: { files: [{ file: 'source-key', type: 'snippet', format: 'javascript' }] }
		}
	);
	assert.equal(piece.metadata.files[0].extra, 'kept');
});

test('game graphics are separate OG contracts without a hidden variant selector', () => {
	const video = mapOpengraphTemplate(
		piece,
		configure({
			name: 'video-game-cartridge',
			mapping: {
				image: 'art',
				publisher: 'game.publisher',
				platform: 'game.platform',
				playTimeMinutes: 'game.minutes'
			}
		})
	);
	const cards = mapOpengraphTemplate(
		piece,
		configure({
			name: 'playing-cards',
			mapping: {
				backdrop: 'art',
				publisher: 'game.publisher',
				playTimeMinutes: 'game.minutes'
			}
		})
	);
	assert.deepEqual(video.fields, {
		image: 'image-key',
		publisher: 'A studio',
		platform: 'Console',
		playTimeMinutes: 90
	});
	assert.deepEqual(cards.fields, {
		backdrop: 'image-key',
		publisher: 'A studio',
		playTimeMinutes: 90
	});
});
