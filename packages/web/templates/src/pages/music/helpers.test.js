import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getMusicLinks } from './helpers.js';

test('music links include independently supplied sources and encode service identifiers', () => {
	const id = 'a/b?x=1&y=# z';
	const encoded = encodeURIComponent(id);
	assert.deepEqual(
		getMusicLinks({
			url: 'https://example.com',
			youtubeId: id,
			spotifyId: id,
			appleMusicUrl: 'https://music.apple.com/album',
			isrc: id
		}),
		[
			{ label: 'source', href: 'https://example.com/' },
			{ label: 'youtube', href: `https://music.youtube.com/watch?v=${encoded}` },
			{ label: 'spotify', href: `https://open.spotify.com/track/${encoded}` },
			{ label: 'apple music', href: 'https://music.apple.com/album' },
			{ label: 'musicbrainz', href: `https://musicbrainz.org/isrc/${encoded}` }
		]
	);
});

test('music omits missing and unsafe user-provided URLs', () => {
	assert.deepEqual(getMusicLinks({}), []);
	for (const url of ['javascript:alert(1)', 'data:text/html,bad', 'not a URL', '//example.com']) {
		assert.deepEqual(getMusicLinks({ url, appleMusicUrl: url }), []);
	}
});
