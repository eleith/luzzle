import assert from 'node:assert/strict';
import { test } from 'node:test';
import { articleBylineSource, articleReadTime } from './helpers.js';

test('article byline prefers authors and cleans only compact HTTP hostnames', () => {
	assert.equal(articleBylineSource('Ada', 'https://www.example.com/story'), 'by Ada');
	assert.equal(articleBylineSource(undefined, 'https://www.example.com/story'), 'example');
	assert.equal(articleBylineSource('', 'https://www.example.org/story'), 'example.org');
	assert.equal(
		articleBylineSource(undefined, 'https://abcdefghijklmnopqrstuvwxy.com'),
		'abcdefghijklmnopqrstuvwxy'
	);
	assert.equal(articleBylineSource(undefined, 'https://abcdefghijklmnopqrstuvwxyz.com'), undefined);
	for (const url of [
		undefined,
		'',
		'not a URL',
		'javascript:alert(1)',
		'mailto:a@example.com',
		'ftp://example.com'
	]) {
		assert.equal(articleBylineSource(undefined, url), undefined);
	}
});

test('article reading time keeps production rounding and omits unknown or zero counts', () => {
	assert.equal(articleReadTime(1), '1 min');
	assert.equal(articleReadTime(374), '1 min');
	assert.equal(articleReadTime(375), '2 min');
	assert.equal(articleReadTime(1000), '4 min');
	for (const count of [undefined, 0, -1, NaN, Infinity]) {
		assert.equal(articleReadTime(count), undefined);
	}
});
