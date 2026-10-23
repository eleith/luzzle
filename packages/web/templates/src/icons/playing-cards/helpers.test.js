import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getCardSymbol } from './helpers.js';

test('card symbol selection preserves the production title hash and ordering', () => {
	assert.deepEqual(['F', 'G', 'A', 'B', 'C', 'D', 'E'].map(getCardSymbol), [
		'icon-shield',
		'icon-dice',
		'icon-trophy',
		'icon-moon',
		'icon-crown',
		'icon-sword',
		'icon-coins'
	]);
	assert.equal(getCardSymbol(''), 'icon-shield');
	assert.equal(getCardSymbol('AB'), getCardSymbol('BA'));
});
