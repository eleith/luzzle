import assert from 'node:assert/strict';
import { test } from 'node:test';
import { schema as poster } from '@luzzle/web.templates/opengraphs/poster/schema';
import { schema as fallback } from '@luzzle/web.templates/opengraphs/default/schema';

test('named poster owns its OG fields independently of the default card', () => {
	assert.equal(poster.name, 'poster');
	assert.equal(fallback.name, 'default');
	assert.notEqual(poster, fallback);
	assert.notEqual(poster.fields, fallback.fields);
});
