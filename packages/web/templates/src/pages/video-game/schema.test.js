import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/pages/video-game/schema';

test('video-game fields are optional root display fields without defaults', () => {
	assert.equal(schema.name, 'video-game');
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.deepEqual(Value.Default(schema.fields, {}), {});
	assert.equal(
		Value.Check(schema.fields, {
			image: 'cover.jpg',
			url: 'https://example.com/game',
			isbn: '978-0-00-000000-0',
			publisher: 'Game publisher',
			datePublished: '2024-01-02',
			playTimeMinutes: 0,
			platform: 'Console'
		}),
		true
	);
	assert.equal(Value.Check(schema.fields, { datePublished: 0, playTimeMinutes: 90.5 }), true);
});

test('video-game rejects legacy metadata, branch switches and invalid display values', () => {
	for (const fields of [
		{ type: 'video' },
		{ variant: 'board' },
		{ fields: { image: 'nested.jpg' } },
		{ representative_image: 'legacy.jpg' },
		{ played_on: 'Console' },
		{ play_time: 90 },
		{ date_published: '2024-01-02' },
		{ number_of_players: 2 },
		{ playTimeMinutes: -1 },
		{ playTimeMinutes: '90' },
		{ datePublished: null },
		{ datePublished: {} },
		{ image: 42 },
		{ url: 42 },
		{ isbn: 42 },
		{ publisher: 42 }
	]) {
		assert.equal(Value.Check(schema.fields, fields), false, JSON.stringify(fields));
	}
});

test('video-game platform is text and does not introduce a tabletop player count', () => {
	assert.equal(Value.Check(schema.fields, { platform: 3 }), false);
	assert.equal(Value.Check(schema.fields, { playerCount: 2 }), false);
});
