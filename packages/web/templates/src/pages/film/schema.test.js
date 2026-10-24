import assert from 'node:assert/strict';
import { test } from 'node:test';
import { schema as film } from '@luzzle/web.templates/pages/film/schema';
import { schema as fallback } from '@luzzle/web.templates/pages/default/schema';

test('film and default are independent page contracts, not aliases', () => {
	assert.equal(film.name, 'film');
	assert.equal(fallback.name, 'default');
	assert.notEqual(film, fallback);
	assert.notEqual(film.fields, fallback.fields);
});
