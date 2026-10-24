import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/pages/tabletop-game/schema';

test('tabletop-game fields are optional root display fields without defaults', () => {
	assert.equal(schema.name, 'tabletop-game');
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
			playerCount: 1
		}),
		true
	);
	assert.equal(Value.Check(schema.fields, { datePublished: 0, playTimeMinutes: 90.5 }), true);
});

test('tabletop-game rejects legacy metadata, branch switches and invalid display values', () => {
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

test('tabletop-game player count is a positive integer, not a video platform', () => {
	assert.equal(Value.Check(schema.fields, { playerCount: 4 }), true);
	for (const playerCount of [0, -1, 1.5, '2']) {
		assert.equal(Value.Check(schema.fields, { playerCount }), false);
	}
	assert.equal(Value.Check(schema.fields, { platform: 'Console' }), false);
});
