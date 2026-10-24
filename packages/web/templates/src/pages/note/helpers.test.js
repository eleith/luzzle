import assert from 'node:assert/strict';
import { test } from 'node:test';
import { noteReadTime } from './helpers.js';

test('note reading time omits short notes and floors the production character estimate', () => {
	for (const note of [undefined, null, '', 'a'.repeat(1249)]) {
		assert.equal(noteReadTime(note), undefined);
	}
	assert.equal(noteReadTime('a'.repeat(1250)), '1 min read');
	assert.equal(noteReadTime('a'.repeat(2499)), '1 min read');
	assert.equal(noteReadTime('a'.repeat(2500)), '2 min read');
});
