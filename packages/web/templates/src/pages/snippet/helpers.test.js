import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getFileByline } from './helpers.js';

test('file byline shows unique languages in first-seen order and counts every file', () => {
	const files = [
		{ file: 'one', name: 'same', format: 'ts' },
		{ file: 'two', name: 'same', format: 'js' },
		{ file: 'three', format: 'ts' },
		{ file: 'four' }
	];
	const snapshot = structuredClone(files);
	assert.deepEqual(getFileByline(files), ['ts, js', '4 files']);
	assert.deepEqual(files, snapshot);
});

test('file byline handles no files and a single file with or without a language', () => {
	assert.deepEqual(getFileByline([]), []);
	assert.deepEqual(getFileByline([{ file: 'one' }]), ['1 file']);
	assert.deepEqual(getFileByline([{ file: 'one', format: 'css' }]), ['css', '1 file']);
});
