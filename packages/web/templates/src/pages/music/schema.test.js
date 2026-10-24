import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from './schema.ts';

test('music fields are optional and do not expose legacy metadata names', () => {
	assert.equal(schema.name, 'music');
	assert.equal(Value.Check(schema.fields, {}), true);
	assert.equal(Value.Check(schema.fields, { iscr: 'legacy' }), false);
	assert.equal(Value.Check(schema.fields, { duration: 120 }), false);
});

test('music accepts page artwork, normalized collaborators and text or numeric release dates', () => {
	const fields = {
		image: 'page-cover',
		artist: 'Artist',
		durationSeconds: 0,
		album: 'Album',
		dateReleased: 0,
		language: 'es',
		collaborators: ['One', { name: 'Two' }],
		url: 'https://example.com',
		youtubeId: 'video',
		spotifyId: 'track',
		appleMusicUrl: 'https://music.apple.com/track',
		isrc: 'ISRC'
	};
	assert.equal(Value.Check(schema.fields, fields), true);
	assert.equal(Value.Check(schema.fields, { ...fields, dateReleased: '2025-01-02' }), true);
	assert.equal(Value.Check(schema.fields, { durationSeconds: -1 }), false);
	assert.equal(Value.Check(schema.fields, { collaborators: [{ label: 'Unmapped' }] }), false);
});
