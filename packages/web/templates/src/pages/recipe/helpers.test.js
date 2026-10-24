import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getTotalMinutes } from './helpers.js';

test('recipe timing calculations remain in code, not configuration expressions', () => {
	assert.equal(getTotalMinutes({ totalMinutes: 8, prepMinutes: 2, cookMinutes: 10 }), 8);
	assert.equal(getTotalMinutes({ prepMinutes: 2, cookMinutes: 10 }), 12);
	assert.equal(getTotalMinutes({ prepMinutes: 0 }), 0);
	assert.equal(getTotalMinutes({}), undefined);
});
