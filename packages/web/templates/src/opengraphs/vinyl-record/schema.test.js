import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Value } from '@sinclair/typebox/value';
import { schema } from '@luzzle/web.templates/opengraphs/vinyl-record/schema';

test('vinyl-record OG fields are independently optional without inventing duration', () => {
	assert.equal(schema.name, 'vinyl-record');
	assert.deepEqual(Value.Default(schema.fields, {}), {});
	for (const fields of [
		{},
		{ image: 'cover-key' },
		{ artist: 'Nina' },
		{ durationSeconds: 0 },
		{ image: 'cover-key', artist: 'Nina', durationSeconds: 59.6 }
	]) {
		assert.equal(Value.Check(schema.fields, fields), true);
	}
});

test('vinyl-record OG fields reject negative durations, wrong types and unmapped metadata', () => {
	for (const fields of [
		{ durationSeconds: -1 },
		{ durationSeconds: '60' },
		{ image: {} },
		{ artist: ['Nina'] },
		{ cover_art: 'cover-key' },
		{ duration: 60 }
	]) {
		assert.equal(Value.Check(schema.fields, fields), false);
	}
});
