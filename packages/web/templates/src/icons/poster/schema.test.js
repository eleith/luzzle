import assert from 'node:assert/strict';
import { test } from 'node:test';
import { schema as poster } from '@luzzle/web.templates/icons/poster/schema';
import { schema as fallback } from '@luzzle/web.templates/icons/default/schema';

test('named poster and default are independently owned contracts', () => {
	assert.equal(poster.name, 'poster');
	assert.equal(fallback.name, 'default');
	assert.notEqual(poster, fallback);
	assert.notEqual(poster.fields, fallback.fields);
});
