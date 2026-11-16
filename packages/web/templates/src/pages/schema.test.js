import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateConfig } from '@luzzle/web.config';
import {
	configSchema,
	selectPageTemplate,
	getPageTemplateNames
} from '@luzzle/web.templates/config';
import { getPageSchema, templates } from '../../dist/pages/schema.js';

function configure(page) {
	return validateConfig(
		{
			pieces: [
				{
					type: 'records',
					fields: { title: 'name', date_consumed: 'date' },
					templates: { page }
				}
			]
		},
		{},
		{ schema: configSchema }
	);
}

test('public routing metadata keeps the first selection and excludes private field mappings', () => {
	const configured = configure({ name: 'book', mapping: { author: 'private.author' } }).pieces[0];
	assert.deepEqual(
		getPageTemplateNames([
			configured,
			configure({ name: 'note' }).pieces[0],
			{ ...configured, type: 'constructor' },
			{ type: 'notes', fields: { title: 'title', date_consumed: 'date' } }
		]),
		{ records: 'book', constructor: 'book', notes: 'default' }
	);
});

test('page selection determines its allowed field mappings', () => {
	assert.equal(
		selectPageTemplate(
			configure({ name: 'book', mapping: { author: 'maker', publicationYear: 'edition.year' } })
				.pieces[0]
		).name,
		'book'
	);
	assert.equal(
		configure({ name: 'film', mapping: { runtime: 'film.minutes' } }).pieces[0].templates.page.name,
		'film'
	);
	assert.throws(() => configure({ name: 'book', mapping: { runtime: 'duration' } }));
	assert.throws(() => configure({ name: 'film', mapping: { author: 'maker' } }));
	assert.throws(() => configure({ name: 'poster' }));
	assert.equal(selectPageTemplate().name, 'default');
	assert.deepEqual(
		templates.map((template) => template.name),
		[
			'default',
			'article',
			'book',
			'film',
			'music',
			'note',
			'recipe',
			'snippet',
			'tabletop-game',
			'video-game'
		]
	);
	for (const template of templates)
		assert.equal(configure({ name: template.name }).pieces[0].templates.page.name, template.name);
	assert.throws(() => getPageSchema('missing'), /Unknown page template/);
});
