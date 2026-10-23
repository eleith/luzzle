import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getRecipeCutouts } from './helpers.js';

test('recipe ring cutouts preserve production geometry at reference width', () => {
	assert.deepEqual(getRecipeCutouts(375), {
		height: 28,
		path:
			'M0,0 H375 V16 A12,12 0 0,1 363,28 H12 A12,12 0 0,1 0,16 Z ' +
			'M90,28 V19 A10,10 0 1,1 98,19 V28 Z ' +
			'M184,28 V19 A10,10 0 1,1 192,19 V28 Z ' +
			'M277,28 V19 A10,10 0 1,1 285,19 V28 Z'
	});
});

test('recipe cutouts retain rounded slot geometry at small widths', () => {
	const cutouts = getRecipeCutouts(125);
	assert.equal(cutouts.height, 9);
	assert.ok(cutouts.path.startsWith('M0,0 H125 V5 A4,4 0 0,1 121,9'));
	assert.ok(cutouts.path.includes('M30,9 V6 A3,3 0 1,1 32,6 V9 Z'));
	assert.doesNotMatch(getRecipeCutouts(0).path, /NaN|Infinity/);
});
